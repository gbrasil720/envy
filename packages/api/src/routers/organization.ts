import { and, count, eq, ne } from '@envy/db'
import { project, secret } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { archiveOrganization } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'
import { recordAudit } from '../lib/audit'
import {
  assertOrgWritable,
  getOrgPlan,
  requireMembership
} from '../lib/org-utils'

const organizationNameSchema = z
  .string()
  .trim()
  .min(1, 'Workspace name is required')
  .max(64)
  .refine((name) => /[a-z0-9]/i.test(name), {
    message: 'Workspace name must contain at least one letter or number'
  })

export const organizationRouter = router({
  get: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const membership = await requireMembership(
        ctx.db,
        input.organizationId,
        ctx.session.user.id
      )
      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: {
          id: true,
          name: true,
          slug: true,
          type: true,
          createdAt: true
        }
      })
      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        })
      }

      const [plan, projectCount, memberCount, secretCount] = await Promise.all([
        getOrgPlan(ctx.db, input.organizationId),
        ctx.db
          .select({ total: count() })
          .from(project)
          .where(eq(project.organizationId, input.organizationId))
          .then((rows) => rows[0]?.total ?? 0),
        ctx.db
          .select({ total: count() })
          .from(member)
          .where(eq(member.organizationId, input.organizationId))
          .then((rows) => rows[0]?.total ?? 0),
        ctx.db
          .select({ total: count() })
          .from(secret)
          .innerJoin(project, eq(secret.projectId, project.id))
          .where(eq(project.organizationId, input.organizationId))
          .then((rows) => rows[0]?.total ?? 0)
      ])

      return {
        ...org,
        role: membership.role,
        plan,
        projectCount,
        memberCount,
        secretCount
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        name: organizationNameSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMembership(
        ctx.db,
        input.organizationId,
        ctx.session.user.id,
        'admin'
      )
      await assertOrgWritable(input.organizationId)

      const current = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: {
          id: true,
          name: true,
          slug: true,
          type: true,
          createdAt: true
        }
      })
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        })
      }

      const name = input.name.trim()
      if (name === current.name) return current

      const [updated] = await ctx.db
        .update(organization)
        .set({ name })
        .where(eq(organization.id, input.organizationId))
        .returning({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
          createdAt: organization.createdAt
        })
      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        })
      }

      await recordAudit(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.session.user.id,
        action: 'organization_renamed',
        targetKey: name,
        metadata: { oldName: current.name, newName: name }
      })

      return updated
    }),

  archive: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const org = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, input.organizationId),
        columns: {
          id: true,
          name: true,
          slug: true,
          type: true,
          deletedAt: true
        }
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

      if (org.type === 'personal') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Personal organizations cannot be archived'
        })
      }

      const membership = await requireMembership(
        ctx.db,
        input.organizationId,
        userId
      )
      if (!membership.isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the organization owner can archive it'
        })
      }

      const fallbackMemberships = await ctx.db.query.member.findMany({
        where: and(
          eq(member.userId, userId),
          ne(member.organizationId, input.organizationId)
        ),
        columns: { organizationId: true },
        with: {
          organization: {
            columns: {
              id: true,
              name: true,
              slug: true,
              type: true,
              deletedAt: true
            }
          }
        }
      })
      const availableFallbacks = fallbackMemberships
        .map((fallbackMembership) => fallbackMembership.organization)
        .filter((fallback) => fallback.deletedAt === null)
      const fallbackOrganization =
        availableFallbacks.find((fallback) => fallback.type === 'personal') ??
        availableFallbacks[0]

      if (!fallbackOrganization) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Another active organization is required before archiving'
        })
      }

      await ctx.db.transaction(async (tx) => {
        await archiveOrganization(input.organizationId, tx)
        await recordAudit(tx, {
          organizationId: input.organizationId,
          userId,
          action: 'organization_archived',
          targetKey: org.name,
          metadata: { fallbackOrganizationId: fallbackOrganization.id }
        })
      })

      const { deletedAt: _deletedAt, ...fallback } = fallbackOrganization
      return { success: true, fallbackOrganization: fallback }
    })
})
