import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { requireWebAuth } from '@/functions/require-web-auth'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/auth/callback')({
  beforeLoad: async () => {
    await requireWebAuth('onboarding-required')
  },
  head: () => ({
    meta: [
      { title: 'Signing In — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: AuthCallbackRedirect
})

function AuthCallbackRedirect() {
  const navigate = useNavigate()
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()

  useEffect(() => {
    const personalOrganization = organizations?.find(
      (organization) => organization.type === 'personal'
    )
    const destination = activeOrganization ?? personalOrganization
    if (!destination) return
    if (!activeOrganization && personalOrganization) {
      void authClient.organization.setActive({
        organizationSlug: personalOrganization.slug
      })
    }
    void navigate({
      to: '/org/$orgSlug',
      params: { orgSlug: destination.slug },
      replace: true
    })
  }, [activeOrganization, navigate, organizations])

  return null
}
