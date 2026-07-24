import { z } from 'zod'
import { protectedProcedure, router } from '..'
import {
  acceptInvite,
  cancelInvite,
  inviteMember,
  listMembers,
  listMembersForOrganization,
  listPendingInvites,
  listRecentInvitations,
  reinviteMember,
  removeMember
} from '../lib/members-service'

export const membersRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => listMembers(ctx, input)),

  listForOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => listMembersForOrganization(ctx, input)),

  pending: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => listPendingInvites(ctx, input)),

  invitations: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => listRecentInvitations(ctx, input)),

  invite: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email(),
        role: z.enum(['admin', 'member'])
      })
    )
    .mutation(async ({ ctx, input }) => inviteMember(ctx, input)),

  accept: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => acceptInvite(ctx, input)),

  reinvite: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => reinviteMember(ctx, input)),

  remove: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => removeMember(ctx, input)),

  cancelInvite: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => cancelInvite(ctx, input))
})
