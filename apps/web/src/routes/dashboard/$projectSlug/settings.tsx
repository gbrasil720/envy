import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCurrentProject } from '@/components/dashboard/project-context'
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
  const detail = useCurrentProject()
  const trpc = useTRPC()
  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const listEntry = projectsQuery.data?.find((p) => p.id === detail.id)
  const secretsCount = listEntry?.secretsCount ?? 0

  return (
    <ProjectSettings
      project={{ ...detail, plan: detail.plan }}
      secretsCount={secretsCount}
      onUpgrade={() => {
        // TODO: checkout
      }}
    />
  )
}
