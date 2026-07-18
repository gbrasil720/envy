import { eq } from '@envy/db'
import { organization } from '@envy/db/schema/organization'
import { archiveOrganization, isOrganizationOwner } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'

export const organizationRouter = router({
  archive: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: { id: true, deletedAt: true }
      })

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        })
      }

      if (org.deletedAt !== null) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Organization is already archived'
        })
      }

      const isOwner = await isOrganizationOwner(input.organizationId, userId)
      if (!isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the organization owner can archive it'
        })
      }

      await archiveOrganization(input.organizationId)

      return { success: true }
    })
})
