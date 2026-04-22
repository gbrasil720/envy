import { and, desc, eq, inArray } from '@envy/db'
import { member, user } from '@envy/db/schema/auth'
import { auditLog } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'

export const auditLogRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0)
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const membership = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.organizationId, input.projectId),
          eq(member.userId, userId)
        ),
        columns: { role: true }
      })

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      const conditions = [eq(auditLog.projectId, input.projectId)]
      if (input.environment) {
        conditions.push(eq(auditLog.environment, input.environment))
      }

      const logs = await ctx.db.query.auditLog.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          userId: true,
          environment: true,
          action: true,
          targetKey: true,
          metadata: true,
          createdAt: true
        },
        orderBy: [desc(auditLog.createdAt)],
        limit: input.limit,
        offset: input.offset
      })

      const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))]

      const users =
        userIds.length > 0
          ? await ctx.db.query.user.findMany({
              where: inArray(user.id, userIds as string[]),
              columns: { id: true, name: true, image: true }
            })
          : []

      const userMap = new Map(users.map((u) => [u.id, u]))

      return logs.map((l) => ({
        ...l,
        user: l.userId ? (userMap.get(l.userId) ?? null) : null
      }))
    })
})
