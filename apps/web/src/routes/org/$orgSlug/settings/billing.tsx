import { createFileRoute } from '@tanstack/react-router'
import { BillingPage } from '@/components/dashboard/billing-page'
import { useDashboardShell } from '@/components/dashboard/dashboard-context'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/org/$orgSlug/settings/billing')({
  component: BillingRoute
})

function BillingRoute() {
  const { organizationId } = useDashboardShell()
  const { data: activeOrganization } = authClient.useActiveOrganization()
  return (
    <BillingPage
      organizationId={organizationId}
      organizationName={activeOrganization?.name ?? 'this organization'}
      organizationType={
        activeOrganization?.type === 'team' ? 'team' : 'personal'
      }
    />
  )
}
