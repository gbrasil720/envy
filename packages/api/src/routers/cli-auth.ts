import { generateApiToken, hashToken, tokenPrefix } from '@envy/crypto'
import { eq, lt } from '@envy/db'
import { apiKey, cliAuthSession } from '@envy/db/schema/envy'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '..'
import { getApiKeyExpiryDate } from '../context'

const POLLING_EXPIRY_MS = 1000 * 60 * 5 // 5 minutes

export const cliAuthRouter = router({
  start: publicProcedure.mutation(async ({ ctx }) => {
    // Clean up expired sessions regardless of status to prevent unbounded DB growth
    await ctx.db
      .delete(cliAuthSession)
      .where(lt(cliAuthSession.expiresAt, new Date()))

    // sessionToken is used for polling (CLI only), browserToken goes in the URL
    const sessionToken = crypto.randomUUID()
    const browserToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + POLLING_EXPIRY_MS)

    await ctx.db.insert(cliAuthSession).values({
      id: crypto.randomUUID(),
      sessionToken,
      browserToken,
      expiresAt,
      status: 'pending'
    })

    return {
      session_token: sessionToken,
      url: `${env.APP_URL}/cli-auth?session=${browserToken}`,
      expires_at: expiresAt.toISOString()
    }
  }),
  poll: publicProcedure
    .input(z.object({ token: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.query.cliAuthSession.findFirst({
        where: eq(cliAuthSession.sessionToken, input.token)
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
          cause: 'Session not found'
        })
      }

      if (new Date() > session.expiresAt) {
        await ctx.db
          .delete(cliAuthSession)
          .where(eq(cliAuthSession.sessionToken, input.token))

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Auth session expired. Run `envy login` again.'
        })
      }

      if (session.status === 'pending') {
        return { status: 'pending' as const }
      }

      if (session.status === 'authorized') {
        if (!session.userId) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Session authorized but user missing'
          })
        }

        // Generate the API token at claim time — never stored in DB
        const rawToken = generateApiToken()
        const keyHash = await hashToken(rawToken)
        const keyPrefix = tokenPrefix(rawToken)
        const keyId = crypto.randomUUID()

        await ctx.db.insert(apiKey).values({
          id: keyId,
          userId: session.userId,
          name: 'CLI',
          keyHash,
          keyPrefix,
          expiresAt: getApiKeyExpiryDate()
        })

        await ctx.db
          .delete(cliAuthSession)
          .where(eq(cliAuthSession.sessionToken, input.token))

        return {
          status: 'authorized' as const,
          api_key: rawToken
        }
      }

      if (session.status === 'cancelled') {
        return { status: 'cancelled' as const }
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected session state',
        cause: 'Unexpected session state'
      })
    }),
  approve: protectedProcedure
    .input(z.object({ token: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Look up by browserToken (the value from the URL), not sessionToken
      const session = await ctx.db.query.cliAuthSession.findFirst({
        where: eq(cliAuthSession.browserToken, input.token)
      })

      if (!session || session.status !== 'pending') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Auth session not found or already used'
        })
      }

      if (new Date() > session.expiresAt) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Auth session expired.'
        })
      }

      // Mark authorized with userId — token is generated later at poll time
      await ctx.db
        .update(cliAuthSession)
        .set({
          status: 'authorized',
          userId: ctx.session.user.id
        })
        .where(eq(cliAuthSession.browserToken, input.token))

      return {
        success: true
      }
    }),
  getSession: publicProcedure
    .input(z.object({ token: z.uuid() }))
    .query(async ({ ctx, input }) => {
      // token here is the browserToken (from URL)
      const session = await ctx.db.query.cliAuthSession.findFirst({
        where: eq(cliAuthSession.browserToken, input.token),
        columns: { expiresAt: true, status: true }
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        })
      }

      return {
        expiresAt: session.expiresAt.toISOString(),
        status: session.status
      }
    }),

  cancel: publicProcedure
    .input(z.object({ token: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      // token here is the browserToken (from URL)
      const session = await ctx.db.query.cliAuthSession.findFirst({
        where: eq(cliAuthSession.browserToken, input.token),
        columns: { id: true, status: true }
      })

      if (!session || session.status !== 'pending') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Auth session not found or already used'
        })
      }

      await ctx.db
        .update(cliAuthSession)
        .set({ status: 'cancelled' })
        .where(eq(cliAuthSession.browserToken, input.token))

      return { success: true }
    })
})
