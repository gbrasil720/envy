import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import type { TRPCError } from '@trpc/server'
import { createCaller } from '../test/caller'
import { assertDbReady, truncateAll } from '../test/db'
import {
  addMember,
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'

async function expectForbidden(request: Promise<unknown>) {
  try {
    await request
    expect.unreachable('expected FORBIDDEN')
  } catch (error) {
    expect((error as TRPCError).code).toBe('FORBIDDEN')
    expect((error as TRPCError).message).toBe(
      'Only the organization owner can manage billing'
    )
  }
}

describe('billing router', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('status exposes owner management capability without hiding billing details', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const regular = await createTestUser({ email: 'member@test.local' })
    const project = await createTestProject(owner.id, 'Billing Visibility')
    await setOrgPlan(project.organizationId, 'team', 5)
    await addMember({
      organizationId: project.organizationId,
      userId: admin.id,
      role: 'admin'
    })
    await addMember({
      organizationId: project.organizationId,
      userId: regular.id
    })

    const ownerStatus = await createCaller(owner.id).billing.status({
      organizationId: project.organizationId
    })
    const adminStatus = await createCaller(admin.id).billing.status({
      organizationId: project.organizationId
    })
    const memberStatus = await createCaller(regular.id).billing.status({
      organizationId: project.organizationId
    })

    expect(ownerStatus.canManageSubscription).toBe(true)
    expect(adminStatus.canManageSubscription).toBe(false)
    expect(memberStatus.canManageSubscription).toBe(false)
    expect(adminStatus.plan).toBe('team')
    expect(memberStatus.memberCount).toBe(3)
  })

  test('admins and members cannot start checkout or open the customer portal', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const regular = await createTestUser({ email: 'member@test.local' })
    const project = await createTestProject(owner.id, 'Billing ACL')
    await setOrgPlan(project.organizationId, 'team', 5)
    await addMember({
      organizationId: project.organizationId,
      userId: admin.id,
      role: 'admin'
    })
    await addMember({
      organizationId: project.organizationId,
      userId: regular.id
    })

    for (const userId of [admin.id, regular.id]) {
      const caller = createCaller(userId)
      await expectForbidden(
        caller.billing.checkout({
          organizationId: project.organizationId,
          plan: 'team'
        })
      )
      await expectForbidden(
        caller.billing.portal({
          organizationId: project.organizationId
        })
      )
    }
  })
})
