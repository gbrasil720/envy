import { and, desc, eq, inArray, lt } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { auditLog, project } from '@envy/db/schema/envy'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { requireMembership, requireProjectAccess } from '../lib/org-utils'

const ACTION_CATEGORIES = {
  secrets: new Set([
    'pushed',
    'revealed',
    'secrets_updated',
    'secrets_deleted'
  ]),
  members: new Set([
    'member_invited',
    'invitation_reinvited',
    'invitation_accepted',
    'invitation_cancelled',
    'invitation_expired',
    'member_removed'
  ]),
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

      const nextCursor = hasMore
        ? items[items.length - 1]?.createdAt.toISOString()
        : undefined

      return {
        logs: enriched,
        nextCursor
      }
    }),

  listForOrganization: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        actionCategory: z.enum(['secrets', 'members', 'cli']).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, input.organizationId, ctx.session.user.id)

      const conditions = [eq(auditLog.organizationId, input.organizationId)]
      if (input.actionCategory) {
        const actions = ACTION_CATEGORIES[input.actionCategory]
        conditions.push(inArray(auditLog.action, [...actions] as string[]))
      }
      if (input.cursor) {
        conditions.push(lt(auditLog.createdAt, new Date(input.cursor)))
      }

      const logs = await ctx.db
        .select({
          id: auditLog.id,
          projectId: auditLog.projectId,
          userId: auditLog.userId,
          environment: auditLog.environment,
          action: auditLog.action,
          targetKey: auditLog.targetKey,
          metadata: auditLog.metadata,
          createdAt: auditLog.createdAt,
          project: {
            id: project.id,
            name: project.name,
            slug: project.slug
          }
        })
        .from(auditLog)
        .leftJoin(project, eq(auditLog.projectId, project.id))
        .where(and(...conditions))
        .orderBy(desc(auditLog.createdAt))
        .limit(input.limit + 1)

      const hasMore = logs.length > input.limit
      const items = hasMore ? logs.slice(0, -1) : logs
      const userIds = [
        ...new Set(items.map((log) => log.userId).filter(Boolean))
      ]
      const users =
        userIds.length > 0
          ? await ctx.db.query.user.findMany({
              where: inArray(user.id, userIds as string[]),
              columns: { id: true, name: true, image: true }
            })
          : []
      const userMap = new Map(users.map((member) => [member.id, member]))

      return {
        logs: items.map((log) => ({
          ...log,
          project: log.project?.id ? log.project : null,
          user: log.userId ? (userMap.get(log.userId) ?? null) : null
        })),
        nextCursor: hasMore
          ? items[items.length - 1]?.createdAt.toISOString()
          : undefined
      }
    })
})
