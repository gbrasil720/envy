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
import { organization } from '@envy/db/schema/organization'
import type { TRPCError } from '@trpc/server'
import { createOwnedProject } from '../lib/create-project'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  addMember,
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'

async function createTeam(ownerId: string, name: string) {
  await createTestProject(ownerId, `${name} Personal`)
  return createOwnedProject(getTestDb(), ownerId, {
    name: `${name} App`,
    organizationType: 'team',
    organizationName: name
  })
}

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

  test('owner archives a team and receives the personal fallback', async () => {
    const owner = await createTestUser()
    const team = await createTeam(owner.id, 'Archive Team')

    const result = await createCaller(owner.id).organization.archive({
      organizationId: team.organizationId
    })

    expect(result.success).toBe(true)
    expect(result.fallbackOrganization.type).toBe('personal')

    const org = await getTestDb().query.organization.findFirst({
      where: eq(organization.id, team.organizationId)
    })
    expect(org?.deletedAt).toBeInstanceOf(Date)

    const audit = await getTestDb().query.auditLog.findFirst({
      where: eq(auditLog.organizationId, team.organizationId)
    })
    expect(audit?.action).toBe('organization_archived')
  })

  test('personal organizations cannot be archived', async () => {
    const owner = await createTestUser()
    const personal = await createTestProject(owner.id, 'Personal Vault')

    await expect(
      createCaller(owner.id).organization.archive({
        organizationId: personal.organizationId
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  test('non-owner cannot archive', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const team = await createTeam(owner.id, 'No Archive')
    await setOrgPlan(team.organizationId, 'team', 5)
    await addMember({
      organizationId: team.organizationId,
      userId: admin.id,
      role: 'admin'
    })

    await expect(
      createCaller(admin.id).organization.archive({
        organizationId: team.organizationId
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  test('double archive is CONFLICT', async () => {
    const owner = await createTestUser()
    const team = await createTeam(owner.id, 'Twice Archive')
    const caller = createCaller(owner.id)

    await caller.organization.archive({
      organizationId: team.organizationId
    })

    await expect(
      caller.organization.archive({
        organizationId: team.organizationId
      })
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  test('unknown organization is NOT_FOUND', async () => {
    const owner = await createTestUser()
    await expect(
      createCaller(owner.id).organization.archive({
        organizationId: crypto.randomUUID()
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('owner and admin can rename while members cannot', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const regular = await createTestUser({ email: 'member@test.local' })
    const team = await createTeam(owner.id, 'Rename Team')
    await setOrgPlan(team.organizationId, 'team', 5)
    await addMember({
      organizationId: team.organizationId,
      userId: admin.id,
      role: 'admin'
    })
    await addMember({
      organizationId: team.organizationId,
      userId: regular.id,
      role: 'member'
    })

    const ownerRename = await createCaller(owner.id).organization.update({
      organizationId: team.organizationId,
      name: 'Owner Name'
    })
    expect(ownerRename.name).toBe('Owner Name')

    const adminRename = await createCaller(admin.id).organization.update({
      organizationId: team.organizationId,
      name: 'Admin Name'
    })
    expect(adminRename.name).toBe('Admin Name')

    await expect(
      createCaller(regular.id).organization.update({
        organizationId: team.organizationId,
        name: 'Member Name'
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const audit = await getTestDb().query.auditLog.findFirst({
      where: eq(auditLog.organizationId, team.organizationId),
      orderBy: (auditLog, { desc }) => [desc(auditLog.createdAt)]
    })
    expect(audit?.action).toBe('organization_renamed')
    expect(audit?.metadata).toMatchObject({
      oldName: 'Owner Name',
      newName: 'Admin Name'
    })
  })

  test('rename validates names and respects read-only seat enforcement', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const team = await createTeam(owner.id, 'Read Only Team')
    await setOrgPlan(team.organizationId, 'team', 1)
    await addMember({
      organizationId: team.organizationId,
      userId: admin.id,
      role: 'admin'
    })

    await expect(
      createCaller(owner.id).organization.update({
        organizationId: team.organizationId,
        name: '!!!'
      })
    ).rejects.toBeDefined()

    try {
      await createCaller(admin.id).organization.update({
        organizationId: team.organizationId,
        name: 'Blocked Rename'
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (error) {
      expect((error as TRPCError).code).toBe('FORBIDDEN')
      expect((error as TRPCError).message).toContain('read-only')
    }
  })
})
