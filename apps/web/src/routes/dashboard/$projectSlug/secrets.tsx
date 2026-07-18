import { createFileRoute } from '@tanstack/react-router'
import { useCurrentProject } from '@/components/dashboard/project-context'
import { SecretsTable } from '@/components/dashboard/secrets-table'

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
  const detail = useCurrentProject()

  return (
    <SecretsTable
      projectId={detail.id}
      environments={detail.environments}
      projectPlan={detail.plan}
    />
  )
}
