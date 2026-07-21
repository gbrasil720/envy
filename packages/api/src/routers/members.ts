import { z } from 'zod'
import { protectedProcedure, router } from '..'
import {
  acceptInvite,
  cancelInvite,
  inviteMember,
  listMembers,
  listPendingInvites,
  removeMember
} from '../lib/members-service'

export const membersRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => listMembers(ctx, input)),

  pending: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => listPendingInvites(ctx, input)),

  invite: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: z.enum(['admin', 'member'])
      })
    )
    .mutation(async ({ ctx, input }) => inviteMember(ctx, input)),

  accept: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => acceptInvite(ctx, input)),

  remove: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => removeMember(ctx, input)),

  cancelInvite: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => cancelInvite(ctx, input))
})