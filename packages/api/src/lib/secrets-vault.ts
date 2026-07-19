import { decrypt, encrypt, hmacValue } from '@envy/crypto'
import { and, eq, sql } from '@envy/db'
import { project, secret } from '@envy/db/schema/envy'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'
import type { Context } from '../context'
import { recordAudit } from './audit'
import { findEnvironmentId, findOrCreateEnvironment } from './environment'
import { assertOrgWritable, requireProjectAccess } from './org-utils'

type Db = Context['db']

/**
 * Load project master key after enforcing org membership (admin+) and soft-delete.
 * createdBy is audit metadata only — never used as ACL.
 */
async function getProjectMasterKey(
  db: Db,
  projectId: string,
  userId: string
): Promise<{ masterKeyBase64: string; organizationId: string }> {
  const access = await requireProjectAccess(db, projectId, userId, 'admin')

  const proj = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: {
      encryptedMk: true,
      mkIv: true,
      mkTag: true
    }
  })

  if (!proj) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
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

  return {
    masterKeyBase64,
    organizationId: access.organizationId
  }
}

export async function pushSecrets(
  db: Db,
  userId: string,
  input: {
    projectId: string
    environment: string
    secrets: Record<string, string>
  }
): Promise<{ upserted: number }> {
  const { masterKeyBase64, organizationId } = await getProjectMasterKey(
    db,
    input.projectId,
    userId
  )
  await assertOrgWritable(organizationId)

  const environmentId = await findOrCreateEnvironment(
    db,
    input.projectId,
    input.environment
  )

  const entries = Object.entries(input.secrets)
  if (entries.length === 0) {
    return { upserted: 0 }
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

  await db.transaction(async (tx) => {
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

    await recordAudit(tx, {
      projectId: input.projectId,
      userId,
      environment: input.environment,
      action: 'pushed',
      metadata: { count: values.length }
    })
  })

  return { upserted: values.length }
}

export async function revealSecrets(
  db: Db,
  userId: string,
  input: { projectId: string; environment: string }
): Promise<{ secrets: Record<string, string> }> {
  const { masterKeyBase64 } = await getProjectMasterKey(
    db,
    input.projectId,
    userId
  )

  const environmentId = await findEnvironmentId(
    db,
    input.projectId,
    input.environment
  )
  if (!environmentId) {
    return { secrets: {} }
  }

  const secrets = await db.query.secret.findMany({
    where: and(
      eq(secret.projectId, input.projectId),
      eq(secret.environmentId, environmentId)
    ),
    columns: {
      key: true,
      encryptedVal: true,
      valIv: true,
      valTag: true
    }
  })

  await recordAudit(db, {
    projectId: input.projectId,
    userId,
    environment: input.environment,
    action: 'revealed',
    metadata: { count: secrets.length }
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
}

export async function diffSecrets(
  db: Db,
  userId: string,
  input: {
    projectId: string
    environment: string
    secrets: Record<string, string>
  }
): Promise<{ added: string[]; changed: string[]; unchanged: string[] }> {
  await getProjectMasterKey(db, input.projectId, userId)

  const environmentId = await findEnvironmentId(
    db,
    input.projectId,
    input.environment
  )

  if (!environmentId) {
    return {
      added: Object.keys(input.secrets),
      changed: [],
      unchanged: []
    }
  }

  const remoteSecrets = await db.query.secret.findMany({
    where: and(
      eq(secret.projectId, input.projectId),
      eq(secret.environmentId, environmentId)
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
}

export async function updateSecret(
  db: Db,
  userId: string,
  input: {
    projectId: string
    environment: string
    key: string
    value: string
  }
): Promise<{ success: true }> {
  const { masterKeyBase64, organizationId } = await getProjectMasterKey(
    db,
    input.projectId,
    userId
  )
  await assertOrgWritable(organizationId)

  const environmentId = await findEnvironmentId(
    db,
    input.projectId,
    input.environment
  )
  if (!environmentId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Environment not found'
    })
  }

  const existing = await db.query.secret.findFirst({
    where: and(
      eq(secret.projectId, input.projectId),
      eq(secret.environmentId, environmentId),
      eq(secret.key, input.key)
    ),
    columns: { id: true }
  })

  if (!existing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Secret not found' })
  }

  const { ciphertext, iv, tag } = await encrypt(input.value, masterKeyBase64)
  const valHash = await hmacValue(input.value, env.SERVER_ENCRYPTION_KEY)

  await db
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
        eq(secret.environmentId, environmentId),
        eq(secret.key, input.key)
      )
    )

  await recordAudit(db, {
    projectId: input.projectId,
    userId,
    environment: input.environment,
    action: 'secrets_updated',
    targetKey: input.key
  })

  return { success: true }
}

export async function deleteSecret(
  db: Db,
  userId: string,
  input: { projectId: string; environment: string; key: string }
): Promise<{ success: true }> {
  const { organizationId } = await getProjectMasterKey(
    db,
    input.projectId,
    userId
  )
  await assertOrgWritable(organizationId)

  const environmentId = await findEnvironmentId(
    db,
    input.projectId,
    input.environment
  )
  if (!environmentId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Environment not found'
    })
  }

  const existing = await db.query.secret.findFirst({
    where: and(
      eq(secret.projectId, input.projectId),
      eq(secret.environmentId, environmentId),
      eq(secret.key, input.key)
    ),
    columns: { id: true }
  })

  if (!existing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Secret not found' })
  }

  await db
    .delete(secret)
    .where(
      and(
        eq(secret.projectId, input.projectId),
        eq(secret.environmentId, environmentId),
        eq(secret.key, input.key)
      )
    )

  await recordAudit(db, {
    projectId: input.projectId,
    userId,
    environment: input.environment,
    action: 'secrets_deleted',
    targetKey: input.key
  })

  return { success: true }
}
