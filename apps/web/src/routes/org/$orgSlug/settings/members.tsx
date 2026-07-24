import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDashboardShell } from '@/components/dashboard/dashboard-context'
import { MembersList } from '@/components/dashboard/members-list'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/org/$orgSlug/settings/members')({
  component: MembersPage
})

function MembersPage() {
  const trpc = useTRPC()
  const { organizationId } = useDashboardShell()
  const meQuery = useQuery(trpc.me.get.queryOptions())
  const billingQuery = useQuery(
    trpc.billing.status.queryOptions({ organizationId })
  )
  return (
    <MembersList
      organizationId={organizationId}
      currentUserId={meQuery.data?.id ?? ''}
      orgPlan={billingQuery.data?.plan ?? 'free'}
    />
  )
}
