import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { and, eq } from '@envy/db'
import { auditLog, secret } from '@envy/db/schema/envy'
import { archiveOrganization } from '@envy/db/services'
import type { TRPCError } from '@trpc/server'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  addMember,
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'
import {
  deleteSecret,
  diffSecrets,
  pushSecrets,
  revealSecrets,
  updateSecret
} from './secrets-vault'

describe('secrets-vault', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('push → reveal round-trip and creates environment', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Vault Project')
    const db = getTestDb()

    const pushed = await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'development',
      secrets: {
        DATABASE_URL: 'postgres://local',
        API_KEY: 'sk-test'
      }
    })
    expect(pushed.upserted).toBe(2)

    const revealed = await revealSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'development'
    })
    expect(revealed.secrets).toEqual({
      DATABASE_URL: 'postgres://local',
      API_KEY: 'sk-test'
    })

    const pushAudit = await db.query.auditLog.findFirst({
      where: and(eq(auditLog.projectId, proj.id), eq(auditLog.action, 'pushed'))
    })
    expect(pushAudit).toBeTruthy()
    expect(pushAudit?.environment).toBe('development')
  })

  test('push with empty map is a no-op', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Empty Push')
    const result = await pushSecrets(getTestDb(), owner.id, {
      projectId: proj.id,
      environment: 'development',
      secrets: {}
    })
    expect(result).toEqual({ upserted: 0 })
  })

  test('push upserts existing keys', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Upsert Project')
    const db = getTestDb()

    await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'staging',
      secrets: { TOKEN: 'v1' }
    })
    await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'staging',
      secrets: { TOKEN: 'v2' }
    })

    const revealed = await revealSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'staging'
    })
    expect(revealed.secrets.TOKEN).toBe('v2')

    const rows = await db.query.secret.findMany({
      where: eq(secret.projectId, proj.id)
    })
    expect(rows).toHaveLength(1)
  })

  test('diff classifies added, changed, unchanged', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Diff Project')
    const db = getTestDb()

    await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'production',
      secrets: { A: '1', B: '2' }
    })

    const result = await diffSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'production',
      secrets: { A: '1', B: 'changed', C: 'new' }
    })

    expect(result.unchanged.sort()).toEqual(['A'])
    expect(result.changed.sort()).toEqual(['B'])
    expect(result.added.sort()).toEqual(['C'])
  })

  test('diff treats missing remote environment as all added', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Diff Empty Env')
    const result = await diffSecrets(getTestDb(), owner.id, {
      projectId: proj.id,
      environment: 'missing',
      secrets: { X: '1', Y: '2' }
    })
    expect(result.added.sort()).toEqual(['X', 'Y'])
    expect(result.changed).toEqual([])
    expect(result.unchanged).toEqual([])
  })

  test('update and delete secret keys', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Mutate Project')
    const db = getTestDb()

    await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'development',
      secrets: { KEEP: '1', DROP: '2' }
    })

    await updateSecret(db, owner.id, {
      projectId: proj.id,
      environment: 'development',
      key: 'KEEP',
      value: 'updated'
    })

    await deleteSecret(db, owner.id, {
      projectId: proj.id,
      environment: 'development',
      key: 'DROP'
    })

    const revealed = await revealSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'development'
    })
    expect(revealed.secrets).toEqual({ KEEP: 'updated' })

    const updateAudit = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.projectId, proj.id),
        eq(auditLog.action, 'secrets_updated')
      )
    })
    expect(updateAudit?.targetKey).toBe('KEEP')

    const deleteAudit = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.projectId, proj.id),
        eq(auditLog.action, 'secrets_deleted')
      )
    })
    expect(deleteAudit?.targetKey).toBe('DROP')
  })

  test('update/delete unknown key returns NOT_FOUND', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Missing Keys')
    const db = getTestDb()

    await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'development',
      secrets: { ONLY: '1' }
    })

    try {
      await updateSecret(db, owner.id, {
        projectId: proj.id,
        environment: 'development',
        key: 'NOPE',
        value: 'x'
      })
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }

    try {
      await deleteSecret(db, owner.id, {
        projectId: proj.id,
        environment: 'development',
        key: 'NOPE'
      })
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }
  })

  test('member without admin cannot push or reveal', async () => {
    const owner = await createTestUser()
    const memberUser = await createTestUser({ email: 'member@test.local' })
    const proj = await createTestProject(owner.id, 'Acl Project')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await addMember({
      organizationId: proj.organizationId,
      userId: memberUser.id,
      role: 'member'
    })
    const db = getTestDb()

    try {
      await pushSecrets(db, memberUser.id, {
        projectId: proj.id,
        environment: 'development',
        secrets: { X: '1' }
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }

    try {
      await revealSecrets(db, memberUser.id, {
        projectId: proj.id,
        environment: 'development'
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }
  })

  test('admin role can push and reveal', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const proj = await createTestProject(owner.id, 'Admin Vault')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await addMember({
      organizationId: proj.organizationId,
      userId: admin.id,
      role: 'admin'
    })
    const db = getTestDb()

    await pushSecrets(db, admin.id, {
      projectId: proj.id,
      environment: 'development',
      secrets: { ADMIN_SECRET: 'yes' }
    })
    const revealed = await revealSecrets(db, admin.id, {
      projectId: proj.id,
      environment: 'development'
    })
    expect(revealed.secrets.ADMIN_SECRET).toBe('yes')
  })

  test('push blocked when organization is read-only (over seat limit)', async () => {
    const owner = await createTestUser()
    const extra = await createTestUser({ email: 'extra@test.local' })
    const proj = await createTestProject(owner.id, 'Readonly Org')
    // seatLimit stays 1 (free), second member exceeds limit
    await addMember({
      organizationId: proj.organizationId,
      userId: extra.id,
      role: 'member'
    })

    try {
      await pushSecrets(getTestDb(), owner.id, {
        projectId: proj.id,
        environment: 'development',
        secrets: { X: '1' }
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('read-only')
    }
  })

  test('push/reveal fail when organization is archived', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Archived Vault')
    await archiveOrganization(proj.organizationId)
    const db = getTestDb()

    try {
      await pushSecrets(db, owner.id, {
        projectId: proj.id,
        environment: 'development',
        secrets: { X: '1' }
      })
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }
  })

  test('reveal returns empty map when environment missing', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'No Env Yet')
    const revealed = await revealSecrets(getTestDb(), owner.id, {
      projectId: proj.id,
      environment: 'production'
    })
    expect(revealed.secrets).toEqual({})
  })
})
