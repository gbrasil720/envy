import { decrypt, encrypt, hmacValue } from '@envy/crypto'
import { and, count, eq, sql } from '@envy/db'
import { member } from '@envy/db/schema/auth'
import { auditLog, environment, project, secret } from '@envy/db/schema/envy'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'
import z from 'zod'
import { protectedProcedure, router } from '..'
import type { Context } from '../context'

async function getProjectMasterKey(
  db: Context['db'],
  projectId: string,
  userId: string
): Promise<string> {
  const proj = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: {
      id: true,
      createdBy: true,
      encryptedMk: true,
      mkIv: true,
      mkTag: true
    }
  })

  if (!proj) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
  }

  const isOwner = proj.createdBy === userId

  if (!isOwner) {
    const m = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, projectId),
        eq(member.userId, userId)
      ),
      columns: { role: true }
    })

    if (!m || !['owner', 'admin'].includes(m.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
    }
  }

  const masterKeyBase64 = await decrypt(
    {
      ciphertext: proj.encryptedMk,
      iv: proj.mkIv,
      tag: proj.mkTag,
      keyVersion: 1
    },
    env.SERVER_ENCRYPTION_KEY
  )

  return masterKeyBase64
}

async function findOrCreateEnvironment(
  db: Context['db'],
  projectId: string,
  environmentName: string
): Promise<string> {
  const existing = await db.query.environment.findFirst({
    where: and(
      eq(environment.projectId, projectId),
      eq(environment.name, environmentName)
    ),
    columns: { id: true }
  })

  if (existing) return existing.id

  const [created] = await db
    .insert(environment)
    .values({
      id: crypto.randomUUID(),
      projectId,
      name: environmentName
    })
    .returning({ id: environment.id })

  return created?.id ?? ''
}

export const secretsRouter = router({
  push: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_-]+$/),
        secrets: z.record(z.string().min(1).max(255), z.string())
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const masterKeyBase64 = await getProjectMasterKey(
        ctx.db,
        input.projectId,
        userId
      )
      const environmentId = await findOrCreateEnvironment(
        ctx.db,
        input.projectId,
        input.environment
      )

      const entries = Object.entries(input.secrets)

      if (entries.length === 0) {
        return { upserted: 0 }
      }

      // Enforce per-plan secret quota
      const org = await ctx.db.query.organization.findFirst({
        where: (o, { eq }) => eq(o.id, input.projectId),
        columns: { metadata: true }
      })
      const plan = ((org?.metadata as { plan?: string } | null)?.plan ??
        'free') as 'free' | 'pro' | 'team'
      const PLAN_SECRET_LIMITS = {
        free: 50,
        pro: Infinity,
        team: Infinity
      } as const
      const limit = PLAN_SECRET_LIMITS[plan]
      if (Number.isFinite(limit)) {
        const [row] = await ctx.db
          .select({ cnt: count() })
          .from(secret)
          .where(eq(secret.projectId, input.projectId))
        const existing = row?.cnt ?? 0
        if (existing + entries.length > limit) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Secret limit (${limit}) reached for your plan.`
          })
        }
      }

      const values = await Promise.all(
        entries.map(async ([key, value]) => {
          const { ciphertext, iv, tag } = await encrypt(value, masterKeyBase64)
          const valHash = await hmacValue(value, env.SERVER_ENCRYPTION_KEY)

          return {
            id: crypto.randomUUID(),
            projectId: input.projectId,
            environmentId,
            key,
            encryptedVal: ciphertext,
            valIv: iv,
            valTag: tag,
            valHash,
            createdBy: userId,
            updatedBy: userId
          }
        })
      )

      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(secret)
          .values(values)
          .onConflictDoUpdate({
            target: [secret.projectId, secret.environmentId, secret.key],
            set: {
              encryptedVal: sql`excluded.encrypted_val`,
              valIv: sql`excluded.val_iv`,
              valTag: sql`excluded.val_tag`,
              valHash: sql`excluded.val_hash`,
              updatedBy: sql`excluded.updated_by`,
              updatedAt: new Date()
            }
          })

        await tx.insert(auditLog).values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          userId,
          environment: input.environment,
          action: 'pushed',
          targetKey: null,
          metadata: { count: values.length },
          createdAt: new Date()
        })
      })

      return { upserted: values.length }
    }),

  reveal: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_-]+$/)
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const masterKeyBase64 = await getProjectMasterKey(
        ctx.db,
        input.projectId,
        userId
      )

      const environmentRow = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.projectId, input.projectId),
          eq(environment.name, input.environment)
        ),
        columns: { id: true }
      })

      if (!environmentRow) {
        return { secrets: {} }
      }

      const secrets = await ctx.db.query.secret.findMany({
        where: and(
          eq(secret.projectId, input.projectId),
          eq(secret.environmentId, environmentRow.id)
        ),
        columns: {
          key: true,
          encryptedVal: true,
          valIv: true,
          valTag: true
        }
      })

      await ctx.db.insert(auditLog).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId,
        environment: input.environment,
        action: 'revealed',
        targetKey: null,
        metadata: { count: secrets.length },
        createdAt: new Date()
      })

      const decrypted = await Promise.all(
        secrets.map(async (s) => {
          try {
            const value = await decrypt(
              {
                ciphertext: s.encryptedVal,
                iv: s.valIv,
                tag: s.valTag,
                keyVersion: 1
              },
              masterKeyBase64
            )
            return [s.key, value] as const
          } catch {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to decrypt secret "${s.key}"`
            })
          }
        })
      )

      return { secrets: Object.fromEntries(decrypted) }
    }),

  diff: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_-]+$/),
        secrets: z.record(z.string().min(1).max(255), z.string())
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      await getProjectMasterKey(ctx.db, input.projectId, userId)

      const environmentRow = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.projectId, input.projectId),
          eq(environment.name, input.environment)
        ),
        columns: { id: true }
      })

      if (!environmentRow) {
        return {
          added: Object.keys(input.secrets),
          changed: [],
          unchanged: []
        }
      }

      const remoteSecrets = await ctx.db.query.secret.findMany({
        where: and(
          eq(secret.projectId, input.projectId),
          eq(secret.environmentId, environmentRow.id)
        ),
        columns: { key: true, valHash: true }
      })

      const remoteMap = new Map(remoteSecrets.map((s) => [s.key, s.valHash]))

      const added: string[] = []
      const changed: string[] = []
      const unchanged: string[] = []

      for (const [key, value] of Object.entries(input.secrets)) {
        if (!remoteMap.has(key)) {
          added.push(key)
        } else {
          const localHash = await hmacValue(value, env.SERVER_ENCRYPTION_KEY)
          if (remoteMap.get(key) !== localHash) {
            changed.push(key)
          } else {
            unchanged.push(key)
          }
        }
      }

      return { added, changed, unchanged }
    }),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_-]+$/),
        key: z.string(),
        value: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const masterKeyBase64 = await getProjectMasterKey(
        ctx.db,
        input.projectId,
        userId
      )

      const environmentRow = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.projectId, input.projectId),
          eq(environment.name, input.environment)
        ),
        columns: { id: true }
      })

      if (!environmentRow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Environment not found'
        })
      }

      const existing = await ctx.db.query.secret.findFirst({
        where: and(
          eq(secret.projectId, input.projectId),
          eq(secret.environmentId, environmentRow.id),
          eq(secret.key, input.key)
        ),
        columns: { id: true }
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Secret not found' })
      }

      const { ciphertext, iv, tag } = await encrypt(
        input.value,
        masterKeyBase64
      )
      const valHash = await hmacValue(input.value, env.SERVER_ENCRYPTION_KEY)

      await ctx.db
        .update(secret)
        .set({
          encryptedVal: ciphertext,
          valIv: iv,
          valTag: tag,
          valHash,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(secret.projectId, input.projectId),
            eq(secret.environmentId, environmentRow.id),
            eq(secret.key, input.key)
          )
        )

      await ctx.db.insert(auditLog).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId,
        environment: input.environment,
        action: 'secrets_updated',
        targetKey: input.key,
        metadata: null,
        createdAt: new Date()
      })

      return { success: true }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_-]+$/),
        key: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      await getProjectMasterKey(ctx.db, input.projectId, userId)

      const environmentRow = await ctx.db.query.environment.findFirst({
        where: and(
          eq(environment.projectId, input.projectId),
          eq(environment.name, input.environment)
        ),
        columns: { id: true }
      })

      if (!environmentRow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Environment not found'
        })
      }

      const existing = await ctx.db.query.secret.findFirst({
        where: and(
          eq(secret.projectId, input.projectId),
          eq(secret.environmentId, environmentRow.id),
          eq(secret.key, input.key)
        ),
        columns: { id: true }
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Secret not found' })
      }

      await ctx.db
        .delete(secret)
        .where(
          and(
            eq(secret.projectId, input.projectId),
            eq(secret.environmentId, environmentRow.id),
            eq(secret.key, input.key)
          )
        )

      await ctx.db.insert(auditLog).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId,
        environment: input.environment,
        action: 'secrets_deleted',
        targetKey: input.key,
        metadata: null,
        createdAt: new Date()
      })

      return { success: true }
    })
})
