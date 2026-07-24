import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  useDashboardActions,
  useDashboardShell
} from '@/components/dashboard/dashboard-context'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/org/$orgSlug/')({
  component: ProjectListPage
})

function ProjectListPage() {
  const { orgSlug } = Route.useParams()
  const navigate = useNavigate()
  const trpc = useTRPC()
  const { organizationId, canManageProjects } = useDashboardShell()
  const { openNewProject } = useDashboardActions()
  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({ organizationId })
  )

  if (projectsQuery.isPending) {
    return (
      <div className="p-7">
        <div className="h-28 animate-pulse rounded-md bg-ghost-bg" />
      </div>
    )
  }

  const projects = projectsQuery.data ?? []
  return (
    <div className="flex flex-col">
      <div className="px-7 pt-9 pb-6">
        <div className="mb-2.5 font-mono text-[11px] text-text-muted">
          {'// organization'}
        </div>
        <h1 className="text-[24px] font-bold tracking-[-0.015em] text-text-primary">
          Where are we shipping today<span className="text-brand">?</span>
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-3 px-7 pb-5 sm:grid-cols-2">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() =>
              void navigate({
                to: '/org/$orgSlug/projects/$projectSlug/secrets',
                params: { orgSlug, projectSlug: project.slug }
              })
            }
            className="flex cursor-pointer flex-col rounded-md border border-ghost-border bg-[#0e0f0e] px-[18px] py-4 text-left transition-colors hover:border-border-focus"
          >
            <span className="text-[15px] font-bold text-text-primary">
              {project.name}
            </span>
            <span className="mt-1 font-mono text-[10px] text-text-muted">
              {project.secretsCount} secrets · {project.environments.length}{' '}
              environments
            </span>
          </button>
        ))}
        {canManageProjects ? (
          <button
            type="button"
            onClick={openNewProject}
            className="flex cursor-pointer flex-col overflow-hidden rounded-md border border-dashed border-ghost-border bg-transparent text-left text-text-primary transition-colors hover:border-brand/50 hover:bg-brand/[0.02]"
          >
            <span className="flex items-center justify-between px-[18px] pt-4 pb-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold tracking-[-0.01em] text-text-primary/85">
                  <span className="text-brand">+</span> new project
                </span>
                <span className="font-mono text-[10px] text-text-muted">
                  3 environments, ready in seconds
                </span>
              </span>
              <span className="rounded border border-ghost-border px-1.5 py-0.5 font-mono text-[9.5px] text-text-muted">
                N
              </span>
            </span>
            <span className="flex items-center border-t border-dashed border-ghost-border px-[18px] py-2.5 font-mono text-[10px] text-text-secondary">
              <span className="text-text-muted">$&nbsp;</span>
              envy init
              <span className="ml-2 text-brand">← or from your terminal</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
