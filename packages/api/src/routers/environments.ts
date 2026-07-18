import { and, count, eq } from '@envy/db'
import { auditLog, environment, secret } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { assertOrgWritable, requireProjectAccess } from '../lib/org-utils'

const envNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9_-]+$/,
    'Only lowercase letters, numbers, hyphens and underscores'
  )

export const environmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await requireProjectAccess(ctx.db, input.projectId, userId)

      const envs = await ctx.db.query.environment.findMany({
        where: eq(environment.projectId, input.projectId),
        columns: { id: true, name: true, createdAt: true },
        orderBy: (e, { asc }) => [asc(e.createdAt)]
      })

      if (envs.length === 0) return []

      const counts = await ctx.db
        .select({ environmentId: secret.environmentId, total: count() })
        .from(secret)
        .where(eq(secret.projectId, input.projectId))
        .groupBy(secret.environmentId)

      const countMap = new Map(counts.map((c) => [c.environmentId, c.total]))

      return envs.map((e) => ({ ...e, secretsCount: countMap.get(e.id) ?? 0 }))
    }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string(), name: envNameSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { organizationId } = await requireProjectAccess(
        ctx.db,
        input.projectId,
        userId,
        'admin'
      )
      await assertOrgWritable(organizationId)

      const existing = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.projectId, input.projectId),
          eq(environment.name, input.name)
        ),
        columns: { id: true }
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Environment "${input.name}" already exists`
        })
      }

      const [created] = await ctx.db
        .insert(environment)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          name: input.name
        })
        .returning({
          id: environment.id,
          name: environment.name,
          createdAt: environment.createdAt
        })

      await ctx.db.insert(auditLog).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId,
        environment: input.name,
        action: 'environment_created',
        targetKey: null,
        metadata: null,
        createdAt: new Date()
      })

      return created
    }),

  rename: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environmentId: z.string(),
        name: envNameSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { organizationId } = await requireProjectAccess(
        ctx.db,
        input.projectId,
        userId,
        'admin'
      )
      await assertOrgWritable(organizationId)

      const env = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.id, input.environmentId),
          eq(environment.projectId, input.projectId)
        ),
        columns: { id: true, name: true }
      })

      if (!env) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Environment not found'
        })
      }

      const conflict = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.projectId, input.projectId),
          eq(environment.name, input.name)
        ),
        columns: { id: true }
      })

      if (conflict && conflict.id !== input.environmentId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Environment "${input.name}" already exists`
        })
      }

      await ctx.db
        .update(environment)
        .set({ name: input.name })
        .where(
          and(
            eq(environment.id, input.environmentId),
            eq(environment.projectId, input.projectId)
          )
        )

      await ctx.db.insert(auditLog).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId,
        environment: input.name,
        action: 'environment_renamed',
        targetKey: null,
        metadata: { oldName: env.name },
        createdAt: new Date()
      })

      return { success: true }
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string(), environmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { organizationId } = await requireProjectAccess(
        ctx.db,
        input.projectId,
        userId,
        'admin'
      )
      await assertOrgWritable(organizationId)

      const env = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.id, input.environmentId),
          eq(environment.projectId, input.projectId)
        ),
        columns: { id: true, name: true }
      })

      if (!env) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Environment not found'
        })
      }

      await ctx.db
        .delete(environment)
        .where(
          and(
            eq(environment.id, input.environmentId),
            eq(environment.projectId, input.projectId)
          )
        )

      await ctx.db.insert(auditLog).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId,
        environment: env.name,
        action: 'environment_deleted',
        targetKey: null,
        metadata: null,
        createdAt: new Date()
      })

      return { success: true }
    })
})
