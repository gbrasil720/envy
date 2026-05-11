import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuthState } from '@/functions/get-auth-state'

export const Route = createFileRoute('/auth/callback')({
  beforeLoad: async () => {
    const auth = await getAuthState()

    if (!auth) {
      throw redirect({ to: '/login' })
    }

    if (!auth.onboardingCompletedAt && !auth.onboardingSkippedAt) {
      throw redirect({ to: '/onboarding' })
    }

    throw redirect({
      to: '/dashboard',
      search: { project: '', section: 'secrets' as const }
    })
  },
  head: () => ({
    meta: [
      { title: 'Signing In — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: () => null
})
