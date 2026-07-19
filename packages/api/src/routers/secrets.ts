import { z } from 'zod'
import { protectedProcedure, router } from '..'
import {
  deleteSecret,
  diffSecrets,
  pushSecrets,
  revealSecrets,
  updateSecret
} from '../lib/secrets-vault'

const envName = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/)

export const secretsRouter = router({
  push: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: envName,
        secrets: z.record(z.string().min(1).max(255), z.string())
      })
    )
    .mutation(async ({ ctx, input }) =>
      pushSecrets(ctx.db, ctx.session.user.id, input)
    ),

  reveal: protectedProcedure
    .input(z.object({ projectId: z.string(), environment: envName }))
    .query(async ({ ctx, input }) =>
      revealSecrets(ctx.db, ctx.session.user.id, input)
    ),

  diff: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: envName,
        secrets: z.record(z.string().min(1).max(255), z.string())
      })
    )
    .mutation(async ({ ctx, input }) =>
      diffSecrets(ctx.db, ctx.session.user.id, input)
    ),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: envName,
        key: z.string(),
        value: z.string()
      })
    )
    .mutation(async ({ ctx, input }) =>
      updateSecret(ctx.db, ctx.session.user.id, input)
    ),

  delete: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: envName,
        key: z.string()
      })
    )
    .mutation(async ({ ctx, input }) =>
      deleteSecret(ctx.db, ctx.session.user.id, input)
    )
})
