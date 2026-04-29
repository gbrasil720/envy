import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { SecretsTable } from '@/components/dashboard/secrets-table'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/dashboard/$projectSlug/secrets')({
  head: ({ params }) => ({
    meta: [
      { title: `${params.projectSlug} / Secrets — Envy` },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: SecretsPage
})

function SecretsPage() {
  const { projectSlug } = Route.useParams()
  const trpc = useTRPC()

  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const projectDetailQuery = useQuery(
    trpc.projects.get.queryOptions({ slug: projectSlug })
  )

  const currentProject =
    projectsQuery.data?.find((p) => p.slug === projectSlug) ?? null
  const detail = projectDetailQuery.data

  if (!detail || !currentProject) return null

  return (
    <SecretsTable
      projectId={detail.id}
      environments={detail.environments}
      projectPlan={currentProject.plan}
    />
  )
}
