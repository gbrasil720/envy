import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { archiveOrganization } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  addMember,
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'
import {
  assertOrgWritable,
  getOrgPlan,
  getOrgSeatLimit,
  requireMembership,
  requireProjectAccess
} from './org-utils'

describe('org-utils', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('getOrgPlan and getOrgSeatLimit read subscription', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Plan Org')
    const db = getTestDb()

    expect(await getOrgPlan(db, proj.organizationId)).toBe('free')
    expect(await getOrgSeatLimit(db, proj.organizationId)).toBe(1)

    await setOrgPlan(proj.organizationId, 'team', 5)
    expect(await getOrgPlan(db, proj.organizationId)).toBe('team')
    expect(await getOrgSeatLimit(db, proj.organizationId)).toBe(5)
  })

  test('getOrgPlan falls back to free when subscription missing', async () => {
    expect(await getOrgPlan(getTestDb(), crypto.randomUUID())).toBe('free')
    expect(await getOrgSeatLimit(getTestDb(), crypto.randomUUID())).toBe(1)
  })

  test('requireMembership allows owner and rejects strangers', async () => {
    const owner = await createTestUser()
    const stranger = await createTestUser({ email: 'stranger@test.local' })
    const proj = await createTestProject(owner.id, 'Members Org')
    const db = getTestDb()

    const membership = await requireMembership(
      db,
      proj.organizationId,
      owner.id
    )
    expect(membership.role).toBe('owner')
    expect(membership.isOwner).toBe(true)

    try {
      await requireMembership(db, proj.organizationId, stranger.id)
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }
  })

  test('requireMembership enforces admin role', async () => {
    const owner = await createTestUser()
    const regular = await createTestUser({ email: 'member@test.local' })
    const proj = await createTestProject(owner.id, 'Admin Gate')
    await addMember({
      organizationId: proj.organizationId,
      userId: regular.id,
      role: 'member'
    })
    // free seatLimit=1 would make org read-only; raise seats for this ACL test
    await setOrgPlan(proj.organizationId, 'team', 5)

    const db = getTestDb()

    try {
      await requireMembership(db, proj.organizationId, regular.id, 'admin')
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('Insufficient')
    }

    const asMember = await requireMembership(
      db,
      proj.organizationId,
      regular.id,
      'member'
    )
    expect(asMember.role).toBe('member')
    expect(asMember.isOwner).toBe(false)
  })

  test('requireMembership treats soft-deleted org as NOT_FOUND', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Archived Org')
    await archiveOrganization(proj.organizationId)

    try {
      await requireMembership(getTestDb(), proj.organizationId, owner.id)
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }
  })

  test('requireProjectAccess resolves project and org membership', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Access Project')
    const access = await requireProjectAccess(
      getTestDb(),
      proj.id,
      owner.id,
      'admin'
    )

    expect(access.project.id).toBe(proj.id)
    expect(access.organizationId).toBe(proj.organizationId)
    expect(access.role).toBe('owner')
    expect(access.isOwner).toBe(true)
  })

  test('requireProjectAccess fails for unknown project', async () => {
    const owner = await createTestUser()
    try {
      await requireProjectAccess(getTestDb(), crypto.randomUUID(), owner.id)
      expect.unreachable('expected NOT_FOUND')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }
  })

  test('assertOrgWritable allows within seat limit and blocks over seat limit', async () => {
    const owner = await createTestUser()
    const extra = await createTestUser({ email: 'extra@test.local' })
    const proj = await createTestProject(owner.id, 'Writable Org')

    // free: 1 member (owner) ≤ seatLimit 1
    await expect(
      assertOrgWritable(proj.organizationId)
    ).resolves.toBeUndefined()

    // add second member without raising seatLimit → read-only
    await addMember({
      organizationId: proj.organizationId,
      userId: extra.id,
      role: 'member'
    })

    try {
      await assertOrgWritable(proj.organizationId)
      expect.unreachable('expected FORBIDDEN read-only')
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError)
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('read-only')
    }
  })
})
