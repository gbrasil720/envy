import { createCheckout, createCustomerPortal } from '@envy/auth/billing'
import { eq } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { organization } from '@envy/db/schema/organization'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import type { Context } from '../context'
import { getOrganizationBilling, requireMembership } from '../lib/org-utils'

const organizationInput = z.object({ organizationId: z.string().min(1) })
const ownerOnlyMessage = 'Only the organization owner can manage billing'

type AuthenticatedContext = Context & {
  session: NonNullable<Context['session']>
}

async function requireBillingOwner(
  ctx: AuthenticatedContext,
  organizationId: string
) {
  const membership = await requireMembership(
    ctx.db,
    organizationId,
    ctx.session.user.id
  )
  if (!membership.isOwner) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: ownerOnlyMessage
    })
  }
  return membership
}

export const billingRouter = router({
  status: protectedProcedure
    .input(organizationInput)
    .query(async ({ ctx, input }) => {
      const membership = await requireMembership(
        ctx.db,
        input.organizationId,
        ctx.session.user.id
      )
      const billing = await getOrganizationBilling(ctx.db, input.organizationId)
      return {
        ...billing,
        canManageSubscription: membership.isOwner
      }
    }),

  checkout: protectedProcedure
    .input(
      organizationInput.extend({
        plan: z.enum(['pro', 'team']),
        returnPath: z.string().max(512).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireBillingOwner(ctx, input.organizationId)
      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: { type: true }
      })
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' })
      const account = await ctx.db.query.user.findFirst({
        where: eq(user.id, ctx.session.user.id),
        columns: { email: true, name: true }
      })
      if (!account)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      try {
        return await createCheckout({
          organizationId: input.organizationId,
          organizationType: org.type,
          plan: input.plan,
          user: account,
          returnUrl: new URL(
            input.returnPath?.startsWith('/org/') ? input.returnPath : '/',
            env.APP_URL
          ).toString()
        })
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Checkout failed'
        })
      }
    }),

  portal: protectedProcedure
    .input(organizationInput)
    .mutation(async ({ ctx, input }) => {
      await requireBillingOwner(ctx, input.organizationId)
      try {
        return await createCustomerPortal({
          organizationId: input.organizationId,
          returnUrl: env.APP_URL
        })
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Portal unavailable'
        })
      }
    })
})
