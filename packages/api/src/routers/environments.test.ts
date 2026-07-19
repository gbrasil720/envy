import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { auditLog, environment } from '@envy/db/schema/envy'
import type { TRPCError } from '@trpc/server'
import { pushSecrets } from '../lib/secrets-vault'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  addMember,
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'

describe('environments router', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('create → list → rename → delete lifecycle', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Lifecycle')
    const caller = createCaller(owner.id)

    const created = await caller.environments.create({
      projectId: proj.id,
      name: 'staging'
    })
    expect(created?.name).toBe('staging')
    expect(created?.id).toBeTruthy()
    const envId = created?.id ?? ''

    const listed = await caller.environments.list({ projectId: proj.id })
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('staging')
    expect(listed[0]?.secretsCount).toBe(0)

    await caller.environments.rename({
      projectId: proj.id,
      environmentId: envId,
      name: 'stage'
    })

    const afterRename = await caller.environments.list({ projectId: proj.id })
    expect(afterRename[0]?.name).toBe('stage')

    await caller.environments.delete({
      projectId: proj.id,
      environmentId: envId
    })

    const afterDelete = await caller.environments.list({ projectId: proj.id })
    expect(afterDelete).toEqual([])

    const audits = await getTestDb().query.auditLog.findMany({
      where: eq(auditLog.projectId, proj.id)
    })
    const actions = audits.map((a) => a.action).sort()
    expect(actions).toContain('environment_created')
    expect(actions).toContain('environment_renamed')
    expect(actions).toContain('environment_deleted')
  })

  test('list includes secretsCount per environment', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Counts')
    const db = getTestDb()

    await pushSecrets(db, owner.id, {
      projectId: proj.id,
      environment: 'development',
      secrets: { A: '1', B: '2' }
    })

    const listed = await createCaller(owner.id).environments.list({
      projectId: proj.id
    })
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('development')
    expect(listed[0]?.secretsCount).toBe(2)
  })

  test('create conflicts on duplicate name', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Conflict')
    const caller = createCaller(owner.id)

    await caller.environments.create({
      projectId: proj.id,
      name: 'production'
    })

    try {
      await caller.environments.create({
        projectId: proj.id,
        name: 'production'
      })
      expect.unreachable('expected CONFLICT')
    } catch (err) {
      expect((err as TRPCError).code).toBe('CONFLICT')
    }
  })

  test('member cannot create environment; admin can', async () => {
    const owner = await createTestUser()
    const memberUser = await createTestUser({ email: 'm@test.local' })
    const admin = await createTestUser({ email: 'a@test.local' })
    const proj = await createTestProject(owner.id, 'Env ACL')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await addMember({
      organizationId: proj.organizationId,
      userId: memberUser.id,
      role: 'member'
    })
    await addMember({
      organizationId: proj.organizationId,
      userId: admin.id,
      role: 'admin'
    })

    try {
      await createCaller(memberUser.id).environments.create({
        projectId: proj.id,
        name: 'dev'
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }

    const created = await createCaller(admin.id).environments.create({
      projectId: proj.id,
      name: 'dev'
    })
    expect(created?.name).toBe('dev')
  })

  test('rejects invalid environment names via zod', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Zod')

    try {
      await createCaller(owner.id).environments.create({
        projectId: proj.id,
        name: 'INVALID NAME'
      })
      expect.unreachable('expected input validation error')
    } catch (err) {
      // tRPC wraps Zod errors as BAD_REQUEST
      expect((err as TRPCError).code).toBe('BAD_REQUEST')
    }
  })

  test('rename/delete unknown environment is NOT_FOUND', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Missing')
    const caller = createCaller(owner.id)
    const missingId = crypto.randomUUID()

    try {
      await caller.environments.rename({
        projectId: proj.id,
        environmentId: missingId,
        name: 'x'
      })
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }

    try {
      await caller.environments.delete({
        projectId: proj.id,
        environmentId: missingId
      })
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }

    // ensure no stray rows
    const rows = await getTestDb().query.environment.findMany({
      where: eq(environment.projectId, proj.id)
    })
    expect(rows).toHaveLength(0)
  })
})
