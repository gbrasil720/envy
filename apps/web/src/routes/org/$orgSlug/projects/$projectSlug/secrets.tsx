import { createFileRoute } from '@tanstack/react-router'
import { useCurrentProject } from '@/components/dashboard/project-context'
import { SecretsTable } from '@/components/dashboard/secrets-table'

export const Route = createFileRoute(
  '/org/$orgSlug/projects/$projectSlug/secrets'
)({
  component: SecretsPage
})

function SecretsPage() {
  const project = useCurrentProject()
  return (
    <SecretsTable
      projectId={project.id}
      environments={project.environments}
      projectPlan={project.plan}
    />
  )
}
