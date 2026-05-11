import { and, count, eq, inArray, isNull, sql } from '@envy/db'
import { member, organization, user } from '@envy/db/schema/auth'
import { auditLog, environment, project, secret } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { createOwnedProject } from '../lib/create-project'

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const memberships = await ctx.db.query.member.findMany({
      where: eq(member.userId, userId),
      columns: { organizationId: true, role: true }
    })

    if (memberships.length === 0) return []

    const orgIds = memberships.map((m) => m.organizationId)

    const ownerMembership = memberships.find((m) => m.role === 'owner')
    const ownerOrg = ownerMembership
      ? await ctx.db.query.organization.findFirst({
          where: (o, { eq }) => eq(o.id, ownerMembership.organizationId),
          columns: { metadata: true }
        })
      : null
    const accountPlan =
      (ownerOrg?.metadata as { plan?: string } | null)?.plan ?? 'free'

    const projects = await ctx.db.query.project.findMany({
      where: (p, { inArray }) => inArray(p.id, orgIds),
      columns: { id: true, name: true, slug: true, createdAt: true },
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

      const created = await createOwnedProject(ctx.db, userId, input)

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
        columns: { id: true, name: true, slug: true, createdAt: true }
      })

      if (!proj) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      const membership = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.organizationId, proj.id),
          eq(member.userId, userId)
        ),
        columns: { role: true }
      })

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      const orgs = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, proj.id),
        columns: { metadata: true }
      })

      const plan = (orgs?.metadata as { plan?: string } | null)?.plan ?? 'free'

      const members = await ctx.db.query.member.findMany({
        where: eq(member.organizationId, proj.id),
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
        members,
        environments
      }
    })
})
