import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AuditLog } from '@/components/dashboard/audit-log'
import { useTRPC } from '@/utils/trpc'

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
  const { projectSlug } = Route.useParams()
  const trpc = useTRPC()

  const projectDetailQuery = useQuery(
    trpc.projects.get.queryOptions({ slug: projectSlug })
  )

  const detail = projectDetailQuery.data

  if (!detail) return null

  return <AuditLog projectId={detail.id} environments={detail.environments} />
}
