import { and, eq } from '@envy/db'
import { environment } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { Context } from '../context'
import { recordAudit } from './audit'

export const envNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9_-]+$/,
    'Only lowercase letters, numbers, hyphens and underscores'
  )

type Db = Context['db']

export async function findEnvironmentId(
  db: Db,
  projectId: string,
  name: string
): Promise<string | null> {
  const existing = await db.query.environment.findFirst({
    where: and(
      eq(environment.projectId, projectId),
      eq(environment.name, name)
    ),
    columns: { id: true }
  })
  return existing?.id ?? null
}

/**
 * Find or create environment by name.
 * Optional auditUserId writes environment_created on insert (dashboard path).
 * Push path omits audit to preserve current product behavior.
 */
export async function findOrCreateEnvironment(
  db: Db,
  projectId: string,
  name: string,
  opts?: { auditUserId?: string; organizationId?: string }
): Promise<string> {
  const existingId = await findEnvironmentId(db, projectId, name)
  if (existingId) return existingId

  const [created] = await db
    .insert(environment)
    .values({
      id: crypto.randomUUID(),
      projectId,
      name
    })
    .returning({ id: environment.id })

  const id = created?.id ?? ''
  if (id && opts?.auditUserId && opts.organizationId) {
    await recordAudit(db, {
      organizationId: opts.organizationId,
      projectId,
      userId: opts.auditUserId,
      action: 'environment_created',
      environment: name
    })
  }
  return id
}

export async function getEnvironmentInProject(
  db: Db,
  projectId: string,
  environmentId: string
): Promise<{ id: string; name: string }> {
  const env = await db.query.environment.findFirst({
    where: and(
      eq(environment.id, environmentId),
      eq(environment.projectId, projectId)
    ),
    columns: { id: true, name: true }
  })

  if (!env) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Environment not found'
    })
  }
  return env
}
