import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  useDashboardActions,
  useDashboardShell
} from '@/components/dashboard/dashboard-context'
import { timeAgoVerbose } from '@/utils/time'
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
        {projects.map((project) => {
          const visibleEnvironments = project.environments.slice(0, 3)
          const remainingEnvironments =
            project.environments.length - visibleEnvironments.length

          return (
            <button
              key={project.id}
              type="button"
              onClick={() =>
                void navigate({
                  to: '/org/$orgSlug/projects/$projectSlug/secrets',
                  params: { orgSlug, projectSlug: project.slug }
                })
              }
              className="group flex min-h-[138px] cursor-pointer flex-col overflow-hidden rounded-md border border-ghost-border bg-[#0e0f0e] text-left transition-[border-color,background-color,transform] duration-150 ease-out hover:border-border-focus hover:bg-[#101210] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand active:scale-[0.99]"
            >
              <span className="flex flex-1 flex-col px-[18px] pt-4 pb-3">
                <span className="flex items-start justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold tracking-[-0.01em] text-text-primary">
                      {project.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-text-muted">
                      $ {project.slug}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[12px] text-text-muted transition-colors duration-150 group-hover:text-brand"
                  >
                    ↗
                  </span>
                </span>

                <span className="mt-auto flex min-w-0 items-center gap-2 pt-4 font-mono text-[10px]">
                  <span className="shrink-0 tracking-[0.08em] text-text-muted uppercase">
                    env
                  </span>
                  <span className="min-w-0 truncate text-text-secondary">
                    {visibleEnvironments.length > 0
                      ? visibleEnvironments
                          .map((environment) => environment.name)
                          .join(' · ')
                      : 'none yet'}
                    {remainingEnvironments > 0
                      ? ` · +${remainingEnvironments}`
                      : ''}
                  </span>
                </span>
              </span>

              <span className="flex items-center justify-between gap-3 border-t border-ghost-divider px-[18px] py-2.5 font-mono text-[10px]">
                <span className="text-text-secondary">
                  <span className="text-text-primary">
                    {project.secretsCount}
                  </span>{' '}
                  secret{project.secretsCount === 1 ? '' : 's'}
                  <span className="mx-1.5 text-text-muted">·</span>
                  <span className="text-text-primary">
                    {project.environments.length}
                  </span>{' '}
                  env{project.environments.length === 1 ? '' : 's'}
                </span>
                <span className="truncate text-right text-text-muted">
                  {project.lastSyncedAt
                    ? `activity ${timeAgoVerbose(project.lastSyncedAt)}`
                    : 'ready for first push'}
                </span>
              </span>
            </button>
          )
        })}
        {canManageProjects ? (
          <button
            type="button"
            onClick={openNewProject}
            className="flex min-h-[138px] cursor-pointer flex-col overflow-hidden rounded-md border border-dashed border-ghost-border bg-transparent text-left text-text-primary transition-[border-color,background-color,transform] duration-150 ease-out hover:border-brand/50 hover:bg-brand/[0.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand active:scale-[0.99]"
          >
            <span className="flex flex-1 flex-col px-[18px] pt-4 pb-3">
              <span className="flex items-start justify-between gap-4">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold tracking-[-0.01em] text-text-primary/85">
                    <span className="text-brand">+</span> new project
                  </span>
                  <span className="font-mono text-[10px] text-text-muted">
                    ready in seconds
                  </span>
                </span>
                <span className="rounded border border-ghost-border px-1.5 py-0.5 font-mono text-[9.5px] text-text-muted">
                  N
                </span>
              </span>

              <span className="mt-auto flex min-w-0 items-center gap-2 pt-4 font-mono text-[10px]">
                <span className="shrink-0 tracking-[0.08em] text-text-muted uppercase">
                  creates
                </span>
                <span className="min-w-0 truncate text-text-secondary">
                  development · staging · production
                </span>
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
