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
import { invitation, member, organization } from '@envy/db/schema/organization'
import type { TRPCError } from '@trpc/server'
import { createAuthenticatedCaller } from '../test/caller'
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
    const listed = await (
      await createAuthenticatedCaller(owner.id)
    ).members.list({
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
      await (await createAuthenticatedCaller(owner.id)).members.invite({
        organizationId: proj.organizationId,
        email: 'new@test.local',
        role: 'member'
      })
      expect.unreachable('expected FORBIDDEN seat limit')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('Seat limit')
    }
  })

  test('invite works for a team organization before it has a project', async () => {
    const owner = await createTestUser()
    const organizationId = crypto.randomUUID()
    await getTestDb()
      .insert(organization)
      .values({
        id: organizationId,
        name: 'Empty Team',
        slug: `empty-team-${organizationId.slice(0, 8)}`,
        type: 'team',
        createdAt: new Date()
      })
    await getTestDb().insert(member).values({
      id: crypto.randomUUID(),
      organizationId,
      userId: owner.id,
      role: 'owner',
      createdAt: new Date()
    })
    await setOrgPlan(organizationId, 'team', 5)

    const invited = await (
      await createAuthenticatedCaller(owner.id)
    ).members.invite({
      organizationId,
      email: 'new-member@test.local',
      role: 'member'
    })

    expect(invited.email).toBe('new-member@test.local')

    const audit = await getTestDb().query.auditLog.findFirst({
      where: eq(auditLog.organizationId, organizationId)
    })
    expect(audit?.action).toBe('member_invited')
    expect(audit?.projectId).toBeNull()

    const activity = await (
      await createAuthenticatedCaller(owner.id)
    ).auditLog.listForOrganization({
      organizationId,
      actionCategory: 'members',
      limit: 50
    })
    expect(activity.logs.map((log) => log.action)).toContain('member_invited')
  })

  test('invite → accept happy path on team plan', async () => {
    const owner = await createTestUser()
    const invitee = await createTestUser({ email: 'invitee@test.local' })
    const proj = await createTestProject(owner.id, 'Team Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)

    const invited = await (
      await createAuthenticatedCaller(owner.id)
    ).members.invite({
      organizationId: proj.organizationId,
      email: invitee.email,
      role: 'member'
    })
    expect(invited.email).toBe(invitee.email)

    const pending = await (
      await createAuthenticatedCaller(owner.id)
    ).members.pending({
      projectId: proj.id
    })
    expect(pending).toHaveLength(1)
    expect(pending[0]?.email).toBe(invitee.email)

    const accepted = await (
      await createAuthenticatedCaller(invitee.id)
    ).members.accept({
      invitationId: invited.id
    })
    expect(accepted.projectId).toBe(proj.id)

    const listed = await (
      await createAuthenticatedCaller(owner.id)
    ).members.list({
      projectId: proj.id
    })
    expect(listed).toHaveLength(2)

    const inviteRow = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, invited.id)
    })
    expect(inviteRow?.status).toBe('accepted')

    const acceptedAudit = await getTestDb().query.auditLog.findFirst({
      where: (log, { and: andCondition, eq: equal }) =>
        andCondition(
          equal(log.organizationId, proj.organizationId),
          equal(log.action, 'invitation_accepted')
        )
    })
    expect(acceptedAudit?.userId).toBe(invitee.id)
    expect(acceptedAudit?.targetKey).toBe(invitee.email)
  })

  test('duplicate pending invite is CONFLICT', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Dup Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)
    const caller = await createAuthenticatedCaller(owner.id)

    await caller.members.invite({
      organizationId: proj.organizationId,
      email: 'same@test.local',
      role: 'admin'
    })

    try {
      await caller.members.invite({
        organizationId: proj.organizationId,
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

    const invited = await (
      await createAuthenticatedCaller(owner.id)
    ).members.invite({
      organizationId: proj.organizationId,
      email: right.email,
      role: 'member'
    })

    try {
      await (await createAuthenticatedCaller(wrong.id)).members.accept({
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
      await (await createAuthenticatedCaller(right.id)).members.accept({
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

    await (await createAuthenticatedCaller(owner.id)).members.invitations({
      organizationId: proj.organizationId
    })
    const expiredAudits = await getTestDb().query.auditLog.findMany({
      where: (log, { and: andCondition, eq: equal }) =>
        andCondition(
          equal(log.organizationId, proj.organizationId),
          equal(log.action, 'invitation_expired')
        )
    })
    expect(expiredAudits).toHaveLength(1)
    expect(expiredAudits[0]?.userId).toBeNull()
    expect(expiredAudits[0]?.targetKey).toBe(right.email)
  })

  test('cancelInvite marks invitation cancelled', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Cancel Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)
    const invited = await (
      await createAuthenticatedCaller(owner.id)
    ).members.invite({
      organizationId: proj.organizationId,
      email: 'cancel@test.local',
      role: 'member'
    })

    await (await createAuthenticatedCaller(owner.id)).members.cancelInvite({
      invitationId: invited.id
    })

    const row = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, invited.id)
    })
    expect(row?.status).toBe('canceled')

    const cancelledAudit = await getTestDb().query.auditLog.findFirst({
      where: (log, { and: andCondition, eq: equal }) =>
        andCondition(
          equal(log.organizationId, proj.organizationId),
          equal(log.action, 'invitation_cancelled')
        )
    })
    expect(cancelledAudit?.userId).toBe(owner.id)
    expect(cancelledAudit?.targetKey).toBe('cancel@test.local')
  })

  test('owners and admins can review recent invitations with inviter details', async () => {
    const owner = await createTestUser({ name: 'Org Owner' })
    const regular = await createTestUser({ email: 'viewer@test.local' })
    const proj = await createTestProject(owner.id, 'Invitation History')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await getTestDb().insert(member).values({
      id: crypto.randomUUID(),
      organizationId: proj.organizationId,
      userId: regular.id,
      role: 'member',
      createdAt: new Date()
    })

    await (await createAuthenticatedCaller(owner.id)).members.invite({
      organizationId: proj.organizationId,
      email: 'history@test.local',
      role: 'admin'
    })

    const invitations = await (
      await createAuthenticatedCaller(owner.id)
    ).members.invitations({
      organizationId: proj.organizationId
    })

    expect(invitations).toHaveLength(1)
    expect(invitations[0]?.email).toBe('history@test.local')
    expect(invitations[0]?.role).toBe('admin')
    expect(invitations[0]?.status).toBe('pending')
    expect(invitations[0]?.inviter).toEqual({
      id: owner.id,
      name: owner.name,
      email: owner.email
    })

    try {
      await (await createAuthenticatedCaller(regular.id)).members.invitations({
        organizationId: proj.organizationId
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }
  })

  test('expired invitations can be sent again without consuming two seats', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Reinvite')
    await setOrgPlan(proj.organizationId, 'team', 2)
    const caller = await createAuthenticatedCaller(owner.id)
    const original = await caller.members.invite({
      organizationId: proj.organizationId,
      email: 'again@test.local',
      role: 'member'
    })

    await getTestDb()
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.id, original.id))

    const history = await caller.members.invitations({
      organizationId: proj.organizationId
    })
    expect(history[0]?.status).toBe('expired')

    const resent = await caller.members.reinvite({
      invitationId: original.id
    })
    expect(resent.id).not.toBe(original.id)
    expect(resent.email).toBe('again@test.local')

    const oldRow = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, original.id)
    })
    const newRow = await getTestDb().query.invitation.findFirst({
      where: eq(invitation.id, resent.id)
    })
    expect(oldRow?.status).toBe('expired')
    expect(newRow?.status).toBe('pending')

    const reinviteAudit = await getTestDb().query.auditLog.findFirst({
      where: (log, { and: andCondition, eq: equal }) =>
        andCondition(
          equal(log.organizationId, proj.organizationId),
          equal(log.action, 'invitation_reinvited')
        )
    })
    expect(reinviteAudit?.targetKey).toBe('again@test.local')
    expect(
      (reinviteAudit?.metadata as Record<string, unknown>)?.previousInvitationId
    ).toBe(original.id)
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
      await (await createAuthenticatedCaller(regular.id)).members.pending({
        projectId: proj.id
      })
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect((err as TRPCError).code).toBe('FORBIDDEN')
    }
  })

  test('accept rejects when already a member', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Already Member')
    await setOrgPlan(proj.organizationId, 'team', 5)

    // Better Auth rejects creating invitations for existing members. Insert a
    // pending row to exercise its acceptance guard against stale legacy data.
    const invitationId = crypto.randomUUID()
    await getTestDb()
      .insert(invitation)
      .values({
        id: invitationId,
        organizationId: proj.organizationId,
        email: owner.email,
        role: 'member',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
        inviterId: owner.id
      })

    try {
      await (await createAuthenticatedCaller(owner.id)).members.accept({
        invitationId
      })
      expect.unreachable('expected CONFLICT')
    } catch (err) {
      expect((err as TRPCError).code).toBe('CONFLICT')
    }
  })

  test('admin removal records the removed member in organization audit', async () => {
    const owner = await createTestUser()
    const regular = await createTestUser({ email: 'removed@test.local' })
    const proj = await createTestProject(owner.id, 'Remove Member')
    await setOrgPlan(proj.organizationId, 'team', 5)
    const memberId = crypto.randomUUID()
    await getTestDb().insert(member).values({
      id: memberId,
      organizationId: proj.organizationId,
      userId: regular.id,
      role: 'member',
      createdAt: new Date()
    })

    await (await createAuthenticatedCaller(owner.id)).members.remove({
      organizationId: proj.organizationId,
      memberId
    })

    const removed = await getTestDb().query.member.findFirst({
      where: eq(member.id, memberId)
    })
    expect(removed).toBeUndefined()

    const removalAudit = await getTestDb().query.auditLog.findFirst({
      where: (log, { and: andCondition, eq: equal }) =>
        andCondition(
          equal(log.organizationId, proj.organizationId),
          equal(log.action, 'member_removed')
        )
    })
    expect(removalAudit?.userId).toBe(owner.id)
    expect(removalAudit?.targetKey).toBe(regular.email)
    expect(
      (removalAudit?.metadata as Record<string, unknown>)?.removedUserId
    ).toBe(regular.id)
  })

  test('invite records member_invited audit event', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Audit Invite')
    await setOrgPlan(proj.organizationId, 'team', 5)

    await (await createAuthenticatedCaller(owner.id)).members.invite({
      organizationId: proj.organizationId,
      email: 'audit@test.local',
      role: 'member'
    })

    const logs = await getTestDb().query.auditLog.findMany({
      where: eq(auditLog.organizationId, proj.organizationId)
    })

    const inviteLog = logs.find((l) => l.action === 'member_invited')
    expect(inviteLog).toBeDefined()
    expect(inviteLog?.projectId).toBeNull()
    expect(inviteLog?.userId).toBe(owner.id)
    expect(inviteLog?.targetKey).toBe('audit@test.local')
    expect((inviteLog?.metadata as Record<string, unknown>)?.role).toBe(
      'member'
    )
  })
})
