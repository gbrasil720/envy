import { and, eq } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { invitation, member } from '@envy/db/schema/organization'
import { effectiveRole } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import {
  assertOrgWritable,
  getOrgSeatLimit,
  requireMembership,
  requireProjectAccess,
  safeRemoveMember
} from '../lib/org-utils'

export const membersRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
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
    }),

  pending: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const { organizationId } = await requireProjectAccess(
        ctx.db,
        input.projectId,
        userId,
        'admin'
      )

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
    }),

  invite: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: z.enum(['admin', 'member'])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const { organizationId } = await requireProjectAccess(
        ctx.db,
        input.projectId,
        userId,
        'admin'
      )
      await assertOrgWritable(organizationId)

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

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)

      const inviteId = crypto.randomUUID()

      await ctx.db.insert(invitation).values({
        id: inviteId,
        organizationId,
        email: input.email,
        role: input.role,
        status: 'pending',
        expiresAt,
        inviterId: userId
      })

      // TODO: send invitation email via Resend
      // await resend.emails.send({ from: 'noreply@useenvy.dev', to: input.email, ... })

      return { id: inviteId, email: input.email }
    }),

  accept: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      if (new Date() > invite.expiresAt) {
        await ctx.db
          .update(invitation)
          .set({ status: 'expired' })
          .where(eq(invitation.id, input.invitationId))

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

      // Custom invite accept — insert allowed only for admin|member.
      // Ownership must never be granted via invite; use Better Auth for that.
      const role =
        invite.role === 'admin' || invite.role === 'member'
          ? invite.role
          : 'member'

      await ctx.db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: invite.organizationId,
        userId,
        role,
        createdAt: new Date()
      })

      await ctx.db
        .update(invitation)
        .set({ status: 'accepted' })
        .where(eq(invitation.id, input.invitationId))

      // Return a project in this org for client navigation (first by createdAt)
      const proj = await ctx.db.query.project.findFirst({
        where: (p, { eq: eqCol }) =>
          eqCol(p.organizationId, invite.organizationId),
        columns: { id: true },
        orderBy: (p, { asc }) => [asc(p.createdAt)]
      })

      return { projectId: proj?.id ?? invite.organizationId }
    }),

  remove: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const requesterId = ctx.session.user.id

      const { organizationId } = await requireProjectAccess(
        ctx.db,
        input.projectId,
        requesterId,
        'admin'
      )

      // Resolve member row so Better Auth gets memberId (not userId)
      const target = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.organizationId, organizationId),
          eq(member.userId, input.userId)
        ),
        columns: { id: true }
      })

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found'
        })
      }

      await safeRemoveMember(ctx, organizationId, target.id)

      return { success: true }
    }),

  cancelInvite: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const invite = await ctx.db.query.invitation.findFirst({
        where: eq(invitation.id, input.invitationId),
        columns: { id: true, organizationId: true }
      })

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found.'
        })
      }

      // Cancel is a recovery path when over seat limit — no assertOrgWritable
      await requireMembership(ctx.db, invite.organizationId, userId, 'admin')

      await ctx.db
        .update(invitation)
        .set({ status: 'cancelled' })
        .where(eq(invitation.id, input.invitationId))

      return { success: true }
    })
})
