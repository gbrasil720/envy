import { and, count, eq, inArray, isNull, sql } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { auditLog, environment, project, secret } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { effectiveRole, hasRole } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { createOwnedProject } from '../lib/create-project'
import { getOrgPlan, requireMembership } from '../lib/org-utils'

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const memberships = await ctx.db.query.member.findMany({
      where: eq(member.userId, userId),
      columns: { organizationId: true, role: true }
    })

    if (memberships.length === 0) return []

    const orgIds = memberships.map((m) => m.organizationId)

    // Filter out soft-deleted organizations
    const orgs = await ctx.db.query.organization.findMany({
      where: and(
        inArray(organization.id, orgIds),
        isNull(organization.deletedAt)
      ),
      columns: { id: true }
    })
    const activeOrgIds = orgs.map((o) => o.id)

    if (activeOrgIds.length === 0) return []

    // Plan from first owned org (role contains owner)
    const ownedOrgId = memberships.find(
      (m) => activeOrgIds.includes(m.organizationId) && hasRole(m.role, 'owner')
    )?.organizationId

    const accountPlan = ownedOrgId
      ? await getOrgPlan(ctx.db, ownedOrgId)
      : 'free'

    // N:1 — projects belong to orgs via organizationId, not project.id === org.id
    const projects = await ctx.db.query.project.findMany({
      where: (p, { inArray: inArr }) => inArr(p.organizationId, activeOrgIds),
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
      plan: accountPlan,
      secretsCount: secretCountMap.get(p.id) ?? 0,
      lastSyncedAt: lastActivityMap.get(p.id) ?? null
    }))
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const created = await ctx.db.transaction(async (tx) =>
        createOwnedProject(tx as unknown as typeof ctx.db, userId, input)
      )

      await ctx.db
        .update(user)
        .set({ onboardingCompletedAt: new Date() })
        .where(and(eq(user.id, userId), isNull(user.onboardingCompletedAt)))

      return created
    }),
  get: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const proj = await ctx.db.query.project.findFirst({
        where: eq(project.slug, input.slug),
        columns: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          organizationId: true
        }
      })

      if (!proj) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      const membership = await requireMembership(
        ctx.db,
        proj.organizationId,
        userId
      )

      const plan = await getOrgPlan(ctx.db, proj.organizationId)

      const members = await ctx.db.query.member.findMany({
        where: eq(member.organizationId, proj.organizationId),
        columns: { id: true, userId: true, role: true, createdAt: true }
      })

      const environments = await ctx.db.query.environment.findMany({
        where: eq(environment.projectId, proj.id),
        columns: { id: true, name: true, createdAt: true }
      })

      return {
        ...proj,
        plan,
        role: membership.role,
        members: members.map((m) => ({
          ...m,
          role: effectiveRole(m.role)
        })),
        environments
      }
    })
})
