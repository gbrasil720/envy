import { createFileRoute } from '@tanstack/react-router'
import { AuditLog } from '@/components/dashboard/audit-log'
import { useDashboardShell } from '@/components/dashboard/dashboard-context'

export const Route = createFileRoute('/org/$orgSlug/settings/audit-log')({
  component: AuditPage
})

function AuditPage() {
  const { organizationId } = useDashboardShell()
  return <AuditLog organizationId={organizationId} />
}
