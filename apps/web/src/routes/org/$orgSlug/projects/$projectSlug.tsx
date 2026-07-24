import type { Plan } from '@envy/api/lib/plan-limits'
import { Button } from '@envy/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useDashboardShell } from '@/components/dashboard/dashboard-context'
import { ProjectProvider } from '@/components/dashboard/project-context'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/org/$orgSlug/projects/$projectSlug')({
  component: ProjectLayout
})

function ProjectLayout() {
  const { orgSlug, projectSlug } = Route.useParams()
  const trpc = useTRPC()
  const { organizationId } = useDashboardShell()
  const projectQuery = useQuery(
    trpc.projects.get.queryOptions({ organizationSlug: orgSlug, projectSlug })
  )
  const billingQuery = useQuery(
    trpc.billing.status.queryOptions({ organizationId })
  )

  if (projectQuery.isPending)
    return <div className="p-7 text-text-muted">Loading project…</div>
  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="p-7">
        <p className="mb-3 text-text-secondary">
          {projectQuery.error?.message ?? 'Project not found'}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => projectQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <ProjectProvider
      project={{
        ...projectQuery.data,
        plan: (billingQuery.data?.plan ?? 'free') as Plan
      }}
    >
      <Outlet />
    </ProjectProvider>
  )
}
