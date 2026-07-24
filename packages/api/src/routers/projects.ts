import { and, count, eq, inArray, isNull, ne, sql } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { auditLog, environment, project, secret } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { effectiveRole } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { recordAudit } from '../lib/audit'
import { createOwnedProject } from '../lib/create-project'
import {
  assertOrgWritable,
  getOrgPlan,
  requireMembership,
  requireProjectAccess
} from '../lib/org-utils'

const projectNameSchema = z
  .string()
  .trim()
  .min(1, 'Project name is required')
  .max(64)
  .refine((name) => /[a-z0-9]/i.test(name), {
    message: 'Project name must contain at least one letter or number'
  })

export const projectsRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1).optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const fallbackMembership = input.organizationId
        ? null
        : await ctx.db
            .select({ organizationId: member.organizationId })
            .from(member)
            .innerJoin(organization, eq(member.organizationId, organization.id))
            .where(
              and(
                eq(member.userId, userId),
                eq(organization.type, 'personal'),
                isNull(organization.deletedAt)
              )
            )
            .limit(1)
            .then((rows) => rows[0] ?? null)
      const organizationId =
        input.organizationId ?? fallbackMembership?.organizationId
      if (!organizationId) return []
      await requireMembership(ctx.db, organizationId, userId)
      const organizationPlan = await getOrgPlan(ctx.db, organizationId)

      // N:1 — projects belong to orgs via organizationId, not project.id === org.id
      const projects = await ctx.db.query.project.findMany({
        where: eq(project.organizationId, organizationId),
        columns: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          organizationId: true
        },
        with: {
          environments: {
            columns: { name: true },
            orderBy: (e, { asc }) => [asc(e.createdAt)]
          }
        }
      })

      if (projects.length === 0) return []

      const projectIds = projects.map((p) => p.id)

      const secretCounts = await ctx.db
        .select({ projectId: secret.projectId, total: count() })
        .from(secret)
        .where(inArray(secret.projectId, projectIds))
        .groupBy(secret.projectId)

      const secretCountMap = new Map(
        secretCounts.map((s) => [s.projectId, s.total])
      )

      const lastActivityRows = await ctx.db
        .select({
          projectId: auditLog.projectId,
          lastAt: sql<string>`max(${auditLog.createdAt})`
        })
        .from(auditLog)
        .where(inArray(auditLog.projectId, projectIds))
        .groupBy(auditLog.projectId)

      const lastActivityMap = new Map(
        lastActivityRows.map((r) => [r.projectId, r.lastAt ?? null])
      )

      return projects.map((p) => ({
        ...p,
        plan: organizationPlan,
        secretsCount: secretCountMap.get(p.id) ?? 0,
        lastSyncedAt: lastActivityMap.get(p.id) ?? null
      }))
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: projectNameSchema,
        organizationId: z.string().min(1).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      if (input.organizationId) {
        await requireMembership(ctx.db, input.organizationId, userId, 'admin')
        await assertOrgWritable(input.organizationId)
      }

      const created = await ctx.db.transaction(async (tx) =>
        createOwnedProject(tx as unknown as typeof ctx.db, userId, input)
      )

      await ctx.db
        .update(user)
        .set({ onboardingCompletedAt: new Date() })
        .where(and(eq(user.id, userId), isNull(user.onboardingCompletedAt)))

      return created
    }),
  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        name: projectNameSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      const access = await requireProjectAccess(
        ctx.db,
        input.projectId,
        ctx.session.user.id,
        'admin'
      )
      await assertOrgWritable(access.organizationId)

      const name = input.name.trim()
      if (name === access.project.name) {
        return access.project
      }

      const sibling = await ctx.db.query.project.findFirst({
        where: and(
          eq(project.organizationId, access.organizationId),
          ne(project.id, input.projectId),
          sql`lower(${project.name}) = lower(${name})`
        ),
        columns: { id: true }
      })
      if (sibling) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A project with this name already exists in the workspace'
        })
      }

      const [updated] = await ctx.db
        .update(project)
        .set({ name, updatedAt: new Date() })
        .where(eq(project.id, input.projectId))
        .returning({
          id: project.id,
          name: project.name,
          slug: project.slug,
          organizationId: project.organizationId,
          createdAt: project.createdAt
        })

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      await recordAudit(ctx.db, {
        organizationId: access.organizationId,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'project_renamed',
        targetKey: name,
        metadata: { oldName: access.project.name, newName: name }
      })

      return updated
    }),
  get: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().min(1),
        projectSlug: z.string().min(1)
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.slug, input.organizationSlug),
        columns: { id: true, type: true }
      })

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        })
      }

      const membership = await requireMembership(ctx.db, org.id, userId)

      const proj = await ctx.db.query.project.findFirst({
        where: (projects, { and: andCondition, eq: eqColumn }) =>
          andCondition(
            eqColumn(projects.slug, input.projectSlug),
            eqColumn(projects.organizationId, org.id)
          ),
        columns: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          organizationId: true
        }
      })

      if (!proj) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found'
        })
      }

      const plan = await getOrgPlan(ctx.db, proj.organizationId)

      const members = await ctx.db.query.member.findMany({
        where: eq(member.organizationId, proj.organizationId),
        columns: { id: true, userId: true, role: true, createdAt: true }
      })

      const environments = await ctx.db.query.environment.findMany({
        where: eq(environment.projectId, proj.id),
        columns: { id: true, name: true, createdAt: true }
      })
      const [secretCountRow, lastActivity] = await Promise.all([
        ctx.db
          .select({ total: count() })
          .from(secret)
          .where(eq(secret.projectId, proj.id))
          .then((rows) => rows[0]?.total ?? 0),
        ctx.db.query.auditLog.findFirst({
          where: eq(auditLog.projectId, proj.id),
          columns: { createdAt: true },
          orderBy: [sql`${auditLog.createdAt} desc`]
        })
      ])

      return {
        ...proj,
        plan,
        organizationType: org.type,
        role: membership.role,
        secretsCount: secretCountRow,
        lastActivityAt: lastActivity?.createdAt ?? null,
        members: members.map((m) => ({
          ...m,
          role: effectiveRole(m.role)
        })),
        environments
      }
    })
})
