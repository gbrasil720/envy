import { and, desc, eq, inArray, lt } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { auditLog } from '@envy/db/schema/envy'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { requireProjectAccess } from '../lib/org-utils'

const ACTION_CATEGORIES = {
  secrets: new Set(['pushed', 'revealed', 'secrets_updated', 'secrets_deleted']),
  members: new Set(['member_invited', 'member_removed']),
  cli: new Set(['pushed', 'pulled', 'revealed'])
} as const

export const auditLogRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        environment: z.string().optional(),
        userId: z.string().optional(),
        actionCategory: z.enum(['secrets', 'members', 'cli']).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      await requireProjectAccess(ctx.db, input.projectId, userId)

      const conditions = [eq(auditLog.projectId, input.projectId)]
      if (input.environment) {
        conditions.push(eq(auditLog.environment, input.environment))
      }
      if (input.userId) {
        conditions.push(eq(auditLog.userId, input.userId))
      }
      if (input.actionCategory) {
        const actions = ACTION_CATEGORIES[input.actionCategory]
        conditions.push(inArray(auditLog.action, [...actions] as string[]))
      }
      if (input.cursor) {
        conditions.push(lt(auditLog.createdAt, new Date(input.cursor)))
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
        limit: input.limit + 1,
        offset: 0
      })

      const hasMore = logs.length > input.limit
      const items = hasMore ? logs.slice(0, -1) : logs

      const userIds = [...new Set(items.map((l) => l.userId).filter(Boolean))]

      const users =
        userIds.length > 0
          ? await ctx.db.query.user.findMany({
              where: inArray(user.id, userIds as string[]),
              columns: { id: true, name: true, image: true }
            })
          : []

      const userMap = new Map(users.map((u) => [u.id, u]))

      const enriched = items.map((l) => ({
        ...l,
        user: l.userId ? (userMap.get(l.userId) ?? null) : null
      }))

      const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined

      return {
        logs: enriched,
        nextCursor
      }
    })
})