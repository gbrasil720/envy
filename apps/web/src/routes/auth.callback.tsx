import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/auth/callback')({
  head: () => ({
    meta: [
      { title: 'Signing In — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  beforeLoad: async ({ context }) => {
    if (typeof window === 'undefined') return

    const { data: session } = await authClient.getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    const me = await context.queryClient.fetchQuery(
      context.trpc.me.get.queryOptions()
    )

    if (!me.onboardingCompletedAt && !me.onboardingSkippedAt) {
      throw redirect({ to: '/onboarding' })
    }

    throw redirect({
      to: '/dashboard',
      search: { project: '', section: 'secrets' as const }
    })
  },
  component: () => null
})
