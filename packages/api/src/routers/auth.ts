import { hashToken } from '@envy/crypto'
import { eq } from '@envy/db'
import { apiKey } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, router } from '..'

export const authRouter = router({
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const authHeader = ctx.authHeader

    if (!authHeader?.startsWith('Bearer ')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Use /api/auth/signout for web session logout'
      })
    }

    const token = authHeader.slice(7)
    const keyHash = await hashToken(token)

    const result = await ctx.db
      .update(apiKey)
      .set({ revokedAt: new Date() })
      .where(eq(apiKey.keyHash, keyHash))
      .returning({ id: apiKey.id })

    if (result.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'API key not found'
      })
    }

    return { success: true }
  })
})
