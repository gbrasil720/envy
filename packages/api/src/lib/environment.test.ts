import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { auditLog } from '@envy/db/schema/envy'
import type { TRPCError } from '@trpc/server'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import { createTestProject, createTestUser } from '../test/factories'
import {
  envNameSchema,
  findEnvironmentId,
  findOrCreateEnvironment,
  getEnvironmentInProject
} from './environment'

describe('environment helpers', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('envNameSchema accepts valid names and rejects invalid', () => {
    expect(envNameSchema.safeParse('development').success).toBe(true)
    expect(envNameSchema.safeParse('prod_1').success).toBe(true)
    expect(envNameSchema.safeParse('INVALID').success).toBe(false)
    expect(envNameSchema.safeParse('has space').success).toBe(false)
    expect(envNameSchema.safeParse('').success).toBe(false)
  })

  test('findOrCreateEnvironment creates once and reuses', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Helper')
    const db = getTestDb()

    const first = await findOrCreateEnvironment(db, proj.id, 'qa')
    const second = await findOrCreateEnvironment(db, proj.id, 'qa')
    expect(first).toBe(second)
    expect(await findEnvironmentId(db, proj.id, 'qa')).toBe(first)
  })

  test('findOrCreateEnvironment can write audit when requested', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Audit')
    const db = getTestDb()

    await findOrCreateEnvironment(db, proj.id, 'preview', {
      auditUserId: owner.id
    })

    const row = await db.query.auditLog.findFirst({
      where: eq(auditLog.projectId, proj.id)
    })
    expect(row?.action).toBe('environment_created')
    expect(row?.environment).toBe('preview')
  })

  test('getEnvironmentInProject throws NOT_FOUND for strangers', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Env Get')
    const db = getTestDb()
    const id = await findOrCreateEnvironment(db, proj.id, 'dev')

    const found = await getEnvironmentInProject(db, proj.id, id)
    expect(found.name).toBe('dev')

    try {
      await getEnvironmentInProject(db, proj.id, crypto.randomUUID())
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }
  })
})
