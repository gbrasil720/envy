import { and, count, eq } from '@envy/db'
import { member, user } from '@envy/db/schema/auth'
import { project, secret } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, router } from '..'

export const meRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
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

    const secretCount = await ctx.db
      .select({ value: count() })
      .from(secret)
      .innerJoin(project, eq(secret.projectId, project.id))
      .where(eq(project.createdBy, ctx.session.user.id))
      .then((r) => r[0]?.value ?? 0)

    const ownedProjects = await ctx.db.query.member.findMany({
      where: and(
        eq(member.userId, ctx.session.user.id),
        eq(member.role, 'owner')
      ),
      columns: { organizationId: true },
      with: {
        organization: { columns: { metadata: true } }
      }
    })

    const plan =
      (ownedProjects[0]?.organization?.metadata as { plan?: string })?.plan ??
      'free'
    const projectCount = ownedProjects.length

    return { ...currentUser, plan, projectCount, secretCount }
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
