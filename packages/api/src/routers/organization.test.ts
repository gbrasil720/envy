import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { organization } from '@envy/db/schema/organization'
import type { TRPCError } from '@trpc/server'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  addMember,
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'

describe('organization router', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('owner can archive organization', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Archive Me')

    const result = await createCaller(owner.id).organization.archive({
      organizationId: proj.organizationId
    })
    expect(result).toEqual({ success: true })

    const org = await getTestDb().query.organization.findFirst({
      where: eq(organization.id, proj.organizationId)
    })
    expect(org?.deletedAt).toBeInstanceOf(Date)
  })

  test('non-owner cannot archive', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const proj = await createTestProject(owner.id, 'No Archive')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await addMember({
      organizationId: proj.organizationId,
      userId: admin.id,
      role: 'admin'
    })

    try {
      await createCaller(admin.id).organization.archive({
        organizationId: proj.organizationId
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }
  })

  test('double archive is CONFLICT', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Twice Archive')
    const caller = createCaller(owner.id)

    await caller.organization.archive({
      organizationId: proj.organizationId
    })

    try {
      await caller.organization.archive({
        organizationId: proj.organizationId
      })
      expect.unreachable('expected CONFLICT')
    } catch (err) {
      expect((err as TRPCError).code).toBe('CONFLICT')
    }
  })

  test('unknown organization is NOT_FOUND', async () => {
    const owner = await createTestUser()
    try {
      await createCaller(owner.id).organization.archive({
        organizationId: crypto.randomUUID()
      })
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }
  })
})
