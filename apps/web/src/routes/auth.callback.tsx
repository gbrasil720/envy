import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireWebAuth } from '@/functions/require-web-auth'

export const Route = createFileRoute('/auth/callback')({
  beforeLoad: async () => {
    await requireWebAuth('onboarding-required')
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
