import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useDashboardActions } from '@/components/dashboard/dashboard-context'
import type { DashboardProject } from '@/components/dashboard/dashboard-types'
import { useTRPC } from '@/utils/trpc'

function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return 'never'
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

function greeting(): string {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return `// good ${part}`
}

export const Route = createFileRoute('/dashboard/')({
  head: () => ({
    meta: [
      { title: 'Projects — Envy Dashboard' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: ProjectListPage
})

function ProjectListPage() {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const { openNewProject } = useDashboardActions()
  const meQuery = useQuery(trpc.me.get.queryOptions())
  const projectsQuery = useQuery(trpc.projects.list.queryOptions())

  const name =
    meQuery.data?.name?.split(' ')[0] ??
    meQuery.data?.email?.split('@')[0] ??
    'there'

  function handleSelectProject(project: DashboardProject) {
    navigate({
      to: '/dashboard/$projectSlug/secrets',
      params: { projectSlug: project.slug }
    })
  }

  if (projectsQuery.isLoading) {
    return (
      <div className="p-7">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-ghost-bg" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              key={i}
              className="h-28 animate-pulse rounded-md border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    )
  }

  const projects = projectsQuery.data ?? []

  return (
    <div className="flex flex-col">
      <div className="px-7 pt-9 pb-6">
        <div className="mb-2.5 font-mono text-[11px] text-text-muted">
          {greeting()}, {name}
        </div>
        <h1 className="text-[24px] font-bold tracking-[-0.015em] text-text-primary">
          Where are we shipping today
          <span className="text-brand">?</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 px-7 pb-5 sm:grid-cols-2">
        {projects.map((project, i) => {
          const envs = project.environments ?? []
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => handleSelectProject(project)}
              className="flex cursor-pointer flex-col overflow-hidden rounded-md border border-ghost-border bg-[#0e0f0e] text-left text-text-primary transition-colors hover:border-border-focus"
            >
              <span className="flex items-center justify-between px-[18px] pt-4 pb-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold tracking-[-0.01em]">
                    {project.name}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted">
                    {project.secretsCount ?? 0} secrets · synced{' '}
                    {formatRelativeTime(project.lastSyncedAt)}
                  </span>
                </span>
                <span className="shrink-0 rounded border border-ghost-border px-1.5 py-0.5 font-mono text-[9.5px] text-text-muted">
                  {i < 9 ? String(i + 1) : '·'}
                </span>
              </span>
              <span className="grid grid-cols-3 border-t border-ghost-divider">
                {(envs.length > 0
                  ? envs.slice(0, 3)
                  : [
                      { name: 'development' },
                      { name: 'staging' },
                      { name: 'production' }
                    ]
                ).map((env, idx) => (
                  <span
                    key={env.name}
                    className={`flex items-center gap-1.5 px-[18px] py-2.5 font-mono text-[10px] text-text-secondary ${
                      idx < 2 ? 'border-r border-ghost-divider' : ''
                    }`}
                  >
                    <span className="text-brand">●</span>
                    {env.name.slice(0, 3)}
                  </span>
                ))}
              </span>
            </button>
          )
        })}

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
      </div>
    </div>
  )
}
