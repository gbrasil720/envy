import { createFileRoute } from '@tanstack/react-router'
import { AuditLog } from '@/components/dashboard/audit-log'
import { useCurrentProject } from '@/components/dashboard/project-context'

export const Route = createFileRoute('/dashboard/$projectSlug/audit')({
  head: ({ params }) => ({
    meta: [
      { title: `${params.projectSlug} / Audit Log — Envy` },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: AuditPage
})

function AuditPage() {
  const detail = useCurrentProject()

  return <AuditLog projectId={detail.id} environments={detail.environments} />
}
