import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ProjectSettings } from '@/components/dashboard/project-settings'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/dashboard/$projectSlug/settings')({
  head: ({ params }) => ({
    meta: [
      { title: `${params.projectSlug} / Settings — Envy` },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: SettingsPage
})

function SettingsPage() {
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
    <ProjectSettings
      project={{ ...detail, plan: currentProject.plan }}
      environments={detail.environments}
      secretsCount={currentProject.secretsCount}
      onUpgrade={() => {
        // TODO: checkout
      }}
    />
  )
}
