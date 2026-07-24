import { and, count, eq, inArray, isNull } from '@envy/db'
import { session, user } from '@envy/db/schema/auth'
import { project, secret } from '@envy/db/schema/envy'
import { member } from '@envy/db/schema/organization'
import { hasRole } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '..'
import { createOwnedProject } from '../lib/create-project'
import { getOrgPlan } from '../lib/org-utils'

export const meRouter = router({
  authState: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id
    if (!userId) {
      return null
    }

    const row = await ctx.db.query.user.findFirst({
      where: (users, { eq: eqCol }) => eqCol(users.id, userId),
      columns: {
        onboardingCompletedAt: true,
        onboardingSkippedAt: true
      }
    })

    if (!row) {
      return null
    }

    return {
      userId,
      onboardingCompletedAt: row.onboardingCompletedAt ?? null,
      onboardingSkippedAt: row.onboardingSkippedAt ?? null
    }
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users, { eq: eqCol }) => eqCol(users.id, ctx.session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        emailVerified: true,
        onboardingCompletedAt: true,
        onboardingSkippedAt: true
      }
    })

    if (!currentUser) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
        cause: 'User not found'
      })
    }

    const memberships = await ctx.db.query.member.findMany({
      where: eq(member.userId, ctx.session.user.id),
      columns: { organizationId: true, role: true }
    })

    const ownedOrgIds = memberships
      .filter((m) => hasRole(m.role, 'owner'))
      .map((m) => m.organizationId)

    const memberOrgIds = memberships.map((m) => m.organizationId)

    const secretCount =
      memberOrgIds.length === 0
        ? 0
        : await ctx.db
            .select({ value: count() })
            .from(secret)
            .innerJoin(project, eq(secret.projectId, project.id))
            .where(inArray(project.organizationId, memberOrgIds))
            .then((r) => r[0]?.value ?? 0)

    const firstOwnedOrgId = ownedOrgIds[0]
    const accountPlan =
      firstOwnedOrgId != null
        ? await getOrgPlan(ctx.db, firstOwnedOrgId)
        : 'free'

    const projectCount =
      ownedOrgIds.length === 0
        ? 0
        : await ctx.db
            .select({ value: count() })
            .from(project)
            .where(inArray(project.organizationId, ownedOrgIds))
            .then((r) => r[0]?.value ?? 0)

    return { ...currentUser, plan: accountPlan, projectCount, secretCount }
  }),

  completeOnboardingWithProject: protectedProcedure
    .input(
      z
        .object({
          name: z
            .string()
            .trim()
            .min(1)
            .max(64)
            .refine((name) => /[a-z0-9]/i.test(name), {
              message: 'Project name must contain at least one letter or number'
            }),
          organizationType: z.enum(['personal', 'team']).default('personal'),
          organizationName: z
            .string()
            .trim()
            .min(1)
            .max(64)
            .refine((name) => /[a-z0-9]/i.test(name), {
              message:
                'Workspace name must contain at least one letter or number'
            })
            .optional()
        })
        .superRefine((input, ctx) => {
          if (input.organizationType === 'team' && !input.organizationName) {
            ctx.addIssue({
              code: 'custom',
              path: ['organizationName'],
              message: 'Team workspace name is required'
            })
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      const completedAt = new Date()
      return await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(user)
          .set({ onboardingCompletedAt: completedAt })
          .where(
            and(
              eq(user.id, ctx.session.user.id),
              isNull(user.onboardingCompletedAt)
            )
          )
          .returning({
            onboardingCompletedAt: user.onboardingCompletedAt
          })

        if (!updated) {
          const existingUser = await tx.query.user.findFirst({
            where: eq(user.id, ctx.session.user.id),
            columns: { id: true }
          })
          if (!existingUser) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found'
            })
          }
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Onboarding has already been completed'
          })
        }

        const proj = await createOwnedProject(tx, ctx.session.user.id, {
          name: input.name,
          organizationType: input.organizationType,
          organizationName: input.organizationName
        })
        if (ctx.session.session?.id) {
          await tx
            .update(session)
            .set({ activeOrganizationId: proj.organizationId })
            .where(eq(session.id, ctx.session.session.id))
        }

        return {
          project: proj,
          onboardingCompletedAt: updated.onboardingCompletedAt
        }
      })
    }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .update(user)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(user.id, ctx.session.user.id))
      .returning({
        id: user.id,
        onboardingCompletedAt: user.onboardingCompletedAt,
        onboardingSkippedAt: user.onboardingSkippedAt
      })

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    }

    return updated
  }),

  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .update(user)
      .set({ onboardingSkippedAt: new Date() })
      .where(eq(user.id, ctx.session.user.id))
      .returning({
        id: user.id,
        onboardingCompletedAt: user.onboardingCompletedAt,
        onboardingSkippedAt: user.onboardingSkippedAt
      })

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    }

    return updated
  })
})
