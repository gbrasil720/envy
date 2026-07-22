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
import { invitation, member } from '@envy/db/schema/organization'
import type { TRPCError } from '@trpc/server'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'

describe('members router', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('list returns members with effective roles', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Members List')
    const listed = await createCaller(owner.id).members.list({
      projectId: proj.id
    })
    expect(listed).toHaveLength(1)
    expect(listed[0]?.role).toBe('owner')
    expect(listed[0]?.userId).toBe(owner.id)
  })

  test('invite is blocked on free seat limit', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Free Seats')

    try {
      await createCaller(owner.id).members.invite({
        projectId: proj.id,
        email: 'new@test.local',
        role: 'member'
      })
      expect.unreachable('expected FORBIDDEN seat limit')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('Seat limit')
    }
  })

  test('invite → accept happy path on team plan', async () => {
    const owner = await createTestUser()
    const invitee = await createTestUser({ email: 'invitee@test.local' })
    const proj = await createTestProject(owner.id, 'Team Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)

    const invited = await createCaller(owner.id).members.invite({
      projectId: proj.id,
      email: invitee.email,
      role: 'member'
    })
    expect(invited.email).toBe(invitee.email)

    const pending = await createCaller(owner.id).members.pending({
      projectId: proj.id
    })
    expect(pending).toHaveLength(1)
    expect(pending[0]?.email).toBe(invitee.email)

    const accepted = await createCaller(invitee.id).members.accept({
      invitationId: invited.id
    })
    expect(accepted.projectId).toBe(proj.id)

    const listed = await createCaller(owner.id).members.list({
      projectId: proj.id
    })
    expect(listed).toHaveLength(2)

    const inviteRow = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, invited.id)
    })
    expect(inviteRow?.status).toBe('accepted')
  })

  test('duplicate pending invite is CONFLICT', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Dup Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)
    const caller = createCaller(owner.id)

    await caller.members.invite({
      projectId: proj.id,
      email: 'same@test.local',
      role: 'admin'
    })

    try {
      await caller.members.invite({
        projectId: proj.id,
        email: 'same@test.local',
        role: 'member'
      })
      expect.unreachable('expected CONFLICT')
    } catch (err) {
      expect((err as TRPCError).code).toBe('CONFLICT')
    }
  })

  test('accept rejects wrong email and expired invites', async () => {
    const owner = await createTestUser()
    const wrong = await createTestUser({ email: 'wrong@test.local' })
    const right = await createTestUser({ email: 'right@test.local' })
    const proj = await createTestProject(owner.id, 'Accept Gates')
    await setOrgPlan(proj.organizationId, 'team', 5)

    const invited = await createCaller(owner.id).members.invite({
      projectId: proj.id,
      email: right.email,
      role: 'member'
    })

    try {
      await createCaller(wrong.id).members.accept({
        invitationId: invited.id
      })
      expect.unreachable('expected FORBIDDEN email mismatch')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('not for your account')
    }

    await getTestDb()
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.id, invited.id))

    try {
      await createCaller(right.id).members.accept({
        invitationId: invited.id
      })
      expect.unreachable('expected FORBIDDEN expired')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('expired')
    }

    const row = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, invited.id)
    })
    expect(row?.status).toBe('expired')
  })

  test('cancelInvite marks invitation cancelled', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Cancel Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)
    const invited = await createCaller(owner.id).members.invite({
      projectId: proj.id,
      email: 'cancel@test.local',
      role: 'member'
    })

    await createCaller(owner.id).members.cancelInvite({
      invitationId: invited.id
    })

    const row = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, invited.id)
    })
    expect(row?.status).toBe('cancelled')
  })

  test('member cannot list pending invites', async () => {
    const owner = await createTestUser()
    const regular = await createTestUser({ email: 'reg@test.local' })
    const proj = await createTestProject(owner.id, 'Pending ACL')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await getTestDb().insert(member).values({
      id: crypto.randomUUID(),
      organizationId: proj.organizationId,
      userId: regular.id,
      role: 'member',
      createdAt: new Date()
    })

    try {
      await createCaller(regular.id).members.pending({ projectId: proj.id })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }
  })

  test('accept rejects when already a member', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Already Member')
    await setOrgPlan(proj.organizationId, 'team', 5)

    // Invite the owner's own email (already member of the org)
    const invited = await createCaller(owner.id).members.invite({
      projectId: proj.id,
      email: owner.email,
      role: 'member'
    })

    try {
      await createCaller(owner.id).members.accept({
        invitationId: invited.id
      })
      expect.unreachable('expected CONFLICT')
    } catch (err) {
      expect((err as TRPCError).code).toBe('CONFLICT')
    }
  })

  test('invite records member_invited audit event', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Audit Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)

    await createCaller(owner.id).members.invite({
      projectId: proj.id,
      email: 'audit@test.local',
      role: 'member'
    })

    const logs = await getTestDb().query.auditLog.findMany({
      where: eq(auditLog.projectId, proj.id)
    })

    const inviteLog = logs.find((l) => l.action === 'member_invited')
    expect(inviteLog).toBeDefined()
    expect(inviteLog?.userId).toBe(owner.id)
    expect(inviteLog?.targetKey).toBe('audit@test.local')
    expect((inviteLog?.metadata as Record<string, unknown>)?.role).toBe(
      'member'
    )
  })
})
