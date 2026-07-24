import { and, eq, lte } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { invitation, member } from '@envy/db/schema/organization'
import { effectiveRole } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import type { Context } from '../context'
import { recordAudit } from './audit'
import {
  assertOrgWritable,
  getOrgSeatLimit,
  requireMembership,
  requireProjectAccess,
  safeAcceptInvitation,
  safeCancelInvitation,
  safeCreateInvitation,
  safeRemoveMember
} from './org-utils'

// Members domain service. Unlike secrets-vault (db, userId, input), these take
// ctx: remove() needs the full ctx for Better Auth's safeRemoveMember.

type AuthCtx = Context & { session: { user: { id: string } } }

async function expirePendingInvitations(
  ctx: AuthCtx,
  organizationId: string,
  now = new Date()
) {
  return ctx.db.transaction(async (tx) => {
    const expired = await tx
      .update(invitation)
      .set({ status: 'expired' })
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.status, 'pending'),
          lte(invitation.expiresAt, now)
        )
      )
      .returning({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role
      })

    for (const expiredInvitation of expired) {
      await recordAudit(tx, {
        organizationId,
        userId: null,
        action: 'invitation_expired',
        targetKey: expiredInvitation.email,
        metadata: {
          invitationId: expiredInvitation.id,
          role: expiredInvitation.role
        }
      })
    }

    return expired
  })
}

export async function listMembers(ctx: AuthCtx, input: { projectId: string }) {
  const userId = ctx.session.user.id

  const { organizationId } = await requireProjectAccess(
    ctx.db,
    input.projectId,
    userId
  )

  const members = await ctx.db.query.member.findMany({
    where: eq(member.organizationId, organizationId),
    columns: { id: true, userId: true, role: true, createdAt: true },
    with: {
      user: {
        columns: { id: true, name: true, image: true }
      }
    }
  })

  return members.map((m) => ({
    ...m,
    role: effectiveRole(m.role)
  }))
}

export async function listMembersForOrganization(
  ctx: AuthCtx,
  input: { organizationId: string }
) {
  await requireMembership(ctx.db, input.organizationId, ctx.session.user.id)

  const members = await ctx.db.query.member.findMany({
    where: eq(member.organizationId, input.organizationId),
    columns: { id: true, userId: true, role: true, createdAt: true },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: (member, { asc }) => [asc(member.createdAt)]
  })

  return members.map((organizationMember) => ({
    ...organizationMember,
    role: effectiveRole(organizationMember.role),
    isCurrentUser: organizationMember.userId === ctx.session.user.id
  }))
}

export async function listPendingInvites(
  ctx: AuthCtx,
  input: { projectId: string }
) {
  const userId = ctx.session.user.id

  const { organizationId } = await requireProjectAccess(
    ctx.db,
    input.projectId,
    userId,
    'admin'
  )

  await expirePendingInvitations(ctx, organizationId)

  return ctx.db.query.invitation.findMany({
    where: and(
      eq(invitation.organizationId, organizationId),
      eq(invitation.status, 'pending')
    ),
    columns: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true
    }
  })
}

export async function listRecentInvitations(
  ctx: AuthCtx,
  input: { organizationId: string }
) {
  const userId = ctx.session.user.id

  await requireMembership(ctx.db, input.organizationId, userId, 'admin')
  await expirePendingInvitations(ctx, input.organizationId)

  const invitations = await ctx.db.query.invitation.findMany({
    where: eq(invitation.organizationId, input.organizationId),
    columns: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true
    },
    with: {
      user: {
        columns: { id: true, name: true, email: true }
      }
    },
    orderBy: (invitation, { desc }) => [desc(invitation.createdAt)],
    limit: 25
  })

  return invitations.map(({ user: inviter, ...recentInvitation }) => ({
    ...recentInvitation,
    inviter
  }))
}

export async function inviteMember(
  ctx: AuthCtx,
  input: {
    organizationId: string
    email: string
    role: 'admin' | 'member'
    auditAction?: 'member_invited' | 'invitation_reinvited'
    previousInvitationId?: string
  }
) {
  const userId = ctx.session.user.id

  await requireMembership(ctx.db, input.organizationId, userId, 'admin')
  const organizationId = input.organizationId
  await assertOrgWritable(organizationId)
  await expirePendingInvitations(ctx, organizationId)

  const seatLimit = await getOrgSeatLimit(ctx.db, organizationId)

  const currentMembers = await ctx.db.query.member.findMany({
    where: eq(member.organizationId, organizationId),
    columns: { id: true }
  })

  const pendingInvites = await ctx.db.query.invitation.findMany({
    where: and(
      eq(invitation.organizationId, organizationId),
      eq(invitation.status, 'pending')
    ),
    columns: { id: true }
  })

  if (currentMembers.length + pendingInvites.length >= seatLimit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Seat limit (${seatLimit}) reached. Remove members or upgrade.`
    })
  }

  const existingInvite = await ctx.db.query.invitation.findFirst({
    where: and(
      eq(invitation.organizationId, organizationId),
      eq(invitation.email, input.email),
      eq(invitation.status, 'pending')
    ),
    columns: { id: true }
  })

  if (existingInvite) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This email already has a pending invitation.'
    })
  }

  const created = await safeCreateInvitation(ctx, {
    organizationId,
    email: input.email,
    role: input.role
  })

  await recordAudit(ctx.db, {
    organizationId,
    userId,
    action: input.auditAction ?? 'member_invited',
    targetKey: input.email,
    metadata: {
      invitationId: created.id,
      role: input.role,
      ...(input.previousInvitationId
        ? { previousInvitationId: input.previousInvitationId }
        : {})
    }
  })

  return { id: created.id, email: created.email }
}

export async function reinviteMember(
  ctx: AuthCtx,
  input: { invitationId: string }
) {
  const userId = ctx.session.user.id
  const invitationToRetry = await ctx.db.query.invitation.findFirst({
    where: eq(invitation.id, input.invitationId),
    columns: {
      id: true,
      organizationId: true,
      email: true,
      role: true
    }
  })

  if (!invitationToRetry) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Invitation not found.'
    })
  }

  await requireMembership(
    ctx.db,
    invitationToRetry.organizationId,
    userId,
    'admin'
  )
  await expirePendingInvitations(ctx, invitationToRetry.organizationId)

  const currentInvitation = await ctx.db.query.invitation.findFirst({
    where: eq(invitation.id, input.invitationId),
    columns: { status: true }
  })

  if (currentInvitation?.status !== 'expired') {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Only expired invitations can be sent again.'
    })
  }

  if (
    invitationToRetry.role !== 'admin' &&
    invitationToRetry.role !== 'member'
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This invitation has an unsupported role.'
    })
  }

  return inviteMember(ctx, {
    organizationId: invitationToRetry.organizationId,
    email: invitationToRetry.email,
    role: invitationToRetry.role,
    auditAction: 'invitation_reinvited',
    previousInvitationId: invitationToRetry.id
  })
}

export async function acceptInvite(
  ctx: AuthCtx,
  input: { invitationId: string }
) {
  const userId = ctx.session.user.id

  const invite = await ctx.db.query.invitation.findFirst({
    where: and(
      eq(invitation.id, input.invitationId),
      eq(invitation.status, 'pending')
    ),
    columns: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      expiresAt: true
    }
  })

  if (!invite) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Invitation not found or already used.'
    })
  }

  if (invite.expiresAt <= new Date()) {
    await expirePendingInvitations(ctx, invite.organizationId)

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Invitation has expired.'
    })
  }

  const currentUser = await ctx.db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true }
  })

  if (
    !currentUser?.email ||
    currentUser.email.toLowerCase() !== invite.email.toLowerCase()
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This invitation is not for your account.'
    })
  }

  const existing = await ctx.db.query.member.findFirst({
    where: and(
      eq(member.organizationId, invite.organizationId),
      eq(member.userId, userId)
    ),
    columns: { id: true }
  })

  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'You are already a member of this project.'
    })
  }

  await assertOrgWritable(invite.organizationId)

  const seatLimit = await getOrgSeatLimit(ctx.db, invite.organizationId)
  const currentMembers = await ctx.db.query.member.findMany({
    where: eq(member.organizationId, invite.organizationId),
    columns: { id: true }
  })

  if (currentMembers.length >= seatLimit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Seat limit (${seatLimit}) reached.`
    })
  }

  await safeAcceptInvitation(ctx, input.invitationId)

  await recordAudit(ctx.db, {
    organizationId: invite.organizationId,
    userId,
    action: 'invitation_accepted',
    targetKey: invite.email,
    metadata: {
      invitationId: invite.id,
      role: invite.role
    }
  })

  // Return a project in this org for client navigation (first by createdAt)
  const proj = await ctx.db.query.project.findFirst({
    where: (p, { eq: eqCol }) => eqCol(p.organizationId, invite.organizationId),
    columns: { id: true },
    orderBy: (p, { asc }) => [asc(p.createdAt)]
  })

  return { projectId: proj?.id ?? invite.organizationId }
}

export async function removeMember(
  ctx: AuthCtx,
  input: { organizationId: string; memberId: string }
) {
  const requesterId = ctx.session.user.id

  await requireMembership(ctx.db, input.organizationId, requesterId, 'admin')

  const target = await ctx.db.query.member.findFirst({
    where: and(
      eq(member.id, input.memberId),
      eq(member.organizationId, input.organizationId)
    ),
    columns: { id: true, userId: true, role: true },
    with: {
      user: {
        columns: { email: true, name: true }
      }
    }
  })

  if (!target) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Member not found'
    })
  }

  if (target.userId === requesterId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You cannot remove yourself from an organization'
    })
  }
  if (effectiveRole(target.role) === 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization owners cannot be removed'
    })
  }

  await safeRemoveMember(ctx, input.organizationId, target.id)

  await recordAudit(ctx.db, {
    organizationId: input.organizationId,
    userId: requesterId,
    action: 'member_removed',
    targetKey: target.user.email,
    metadata: {
      removedMemberId: target.id,
      removedUserId: target.userId,
      removedName: target.user.name,
      role: target.role
    }
  })

  return { success: true }
}

export async function cancelInvite(
  ctx: AuthCtx,
  input: { invitationId: string }
) {
  const userId = ctx.session.user.id

  const invite = await ctx.db.query.invitation.findFirst({
    where: eq(invitation.id, input.invitationId),
    columns: {
      id: true,
      organizationId: true,
      email: true,
      role: true
    }
  })

  if (!invite) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Invitation not found.'
    })
  }

  // Cancel is a recovery path when over seat limit — no assertOrgWritable
  await requireMembership(ctx.db, invite.organizationId, userId, 'admin')
  await expirePendingInvitations(ctx, invite.organizationId)

  const currentInvitation = await ctx.db.query.invitation.findFirst({
    where: eq(invitation.id, input.invitationId),
    columns: { status: true }
  })

  if (currentInvitation?.status !== 'pending') {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Only pending invitations can be canceled.'
    })
  }

  await safeCancelInvitation(ctx, input.invitationId)

  await recordAudit(ctx.db, {
    organizationId: invite.organizationId,
    userId,
    action: 'invitation_cancelled',
    targetKey: invite.email,
    metadata: {
      invitationId: invite.id,
      role: invite.role
    }
  })

  return { success: true }
}
