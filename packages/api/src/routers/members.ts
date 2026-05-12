import { and, eq } from '@envy/db'
import { invitation, member, organization, user } from '@envy/db/schema/auth'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import type { Context } from '../context'

const PLAN_MEMBER_LIMITS = {
  free: 1,
  pro: 1,
  team: 5
} as const

async function requireMembership(
  db: Context['db'],
  organizationId: string,
  userId: string,
  requiredRole: 'owner' | 'admin' | 'member' = 'member'
) {
  const m = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, userId)
    ),
    columns: { role: true }
  })

  if (!m) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  const hierarchy = { owner: 3, admin: 2, member: 1 }
  if (hierarchy[m.role as keyof typeof hierarchy] < hierarchy[requiredRole]) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions'
    })
  }

  return m
}

async function getOrgPlan(
  db: Context['db'],
  organizationId: string
): Promise<'free' | 'pro' | 'team'> {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { metadata: true }
  })
  const metadata = org?.metadata as { plan?: string } | null
  const plan = metadata?.plan
  if (plan === 'pro' || plan === 'team') return plan
  return 'free'
}

export const membersRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      await requireMembership(ctx.db, input.projectId, userId)

      const members = await ctx.db.query.member.findMany({
        where: eq(member.organizationId, input.projectId),
        columns: { id: true, userId: true, role: true, createdAt: true },
        with: {
          user: {
            columns: { id: true, name: true, image: true }
          }
        }
      })

      return members
    }),

  pending: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      await requireMembership(ctx.db, input.projectId, userId, 'admin')

      return ctx.db.query.invitation.findMany({
        where: and(
          eq(invitation.organizationId, input.projectId),
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

      await requireMembership(ctx.db, input.projectId, userId, 'admin')

      const plan = await getOrgPlan(ctx.db, input.projectId)

      if (plan !== 'team') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Member invitations require the Team plan.'
        })
      }

      const currentMembers = await ctx.db.query.member.findMany({
        where: eq(member.organizationId, input.projectId),
        columns: { id: true }
      })

      const pendingInvites = await ctx.db.query.invitation.findMany({
        where: and(
          eq(invitation.organizationId, input.projectId),
          eq(invitation.status, 'pending')
        ),
        columns: { id: true }
      })

      const limit = PLAN_MEMBER_LIMITS[plan]
      if (currentMembers.length + pendingInvites.length >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Team plan allows up to ${limit} members.`
        })
      }

      const existingInvite = await ctx.db.query.invitation.findFirst({
        where: and(
          eq(invitation.organizationId, input.projectId),
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
        organizationId: input.projectId,
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

      await ctx.db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: invite.organizationId,
        userId,
        role: invite.role ?? 'member',
        createdAt: new Date()
      })

      await ctx.db
        .update(invitation)
        .set({ status: 'accepted' })
        .where(eq(invitation.id, input.invitationId))

      return { projectId: invite.organizationId }
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

      await requireMembership(ctx.db, input.projectId, requesterId, 'admin')

      const target = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.organizationId, input.projectId),
          eq(member.userId, input.userId)
        ),
        columns: { role: true }
      })

      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' })
      }

      if (target.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'The project owner cannot be removed.'
        })
      }

      await ctx.db
        .delete(member)
        .where(
          and(
            eq(member.organizationId, input.projectId),
            eq(member.userId, input.userId)
          )
        )

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

      await requireMembership(ctx.db, invite.organizationId, userId, 'admin')

      await ctx.db
        .update(invitation)
        .set({ status: 'cancelled' })
        .where(eq(invitation.id, input.invitationId))

      return { success: true }
    })
})
