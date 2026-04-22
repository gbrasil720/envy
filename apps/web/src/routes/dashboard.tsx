import { Avatar, AvatarFallback } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@envy/ui/components/empty'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  ArrowRight01Icon,
  LockIcon,
  PlusSignIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { AppTopbar } from '@/components/dashboard/app-topbar'
import { AuditLog } from '@/components/dashboard/audit-log'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { dashboardPlanBadgeClass } from '@/components/dashboard/dashboard-classes'
import { DashboardIcon } from '@/components/dashboard/dashboard-icon'
import type {
  DashboardProject,
  DashboardSection
} from '@/components/dashboard/dashboard-types'
import { MembersList } from '@/components/dashboard/members-list'
import { NewProjectDialog } from '@/components/dashboard/new-project-dialog'
import { ProjectSettings } from '@/components/dashboard/project-settings'
import { SecretsTable } from '@/components/dashboard/secrets-table'
import { MeshBackground } from '@/components/mesh-background'
import { useRecentProjects } from '@/hooks/useRecentProjects'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => ({
    project: (search.project as string) ?? '',
    section: (search.section as DashboardSection) ?? 'secrets'
  })
})

export function DashboardPage() {
  const trpc = useTRPC()
  const { project: projectSlug, section } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const { trackOpen, getRecent } = useRecentProjects()
  const meQuery = useQuery(trpc.me.get.queryOptions())

  const projectDetailQuery = useQuery({
    ...trpc.projects.get.queryOptions({ slug: projectSlug ?? '' }),
    enabled: !!projectSlug
  })

  const projectsQuery = useQuery(trpc.projects.list.queryOptions())

  const currentProject =
    projectsQuery.data?.find((p) => p.slug === projectSlug) ?? null

  const detail = projectDetailQuery.data

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  function setSection(s: DashboardSection) {
    navigate({ search: (prev) => ({ ...prev, section: s }) })
  }

  function handleSelectProject(project: DashboardProject) {
    trackOpen(project.id)
    navigate({ search: { project: project.slug, section: 'secrets' } })
  }

  function handleNewProjectSuccess(project: {
    id: string
    name: string
    slug: string
  }) {
    navigate({ search: { project: project.slug, section: 'secrets' } })
  }

  const recentIds = getRecent()
  const recentProjects = recentIds
    .map((id) => projectsQuery.data?.find((p) => p.id === id))
    .filter(Boolean) as DashboardProject[]

  return (
    <MeshBackground
      className="flex h-screen overflow-hidden"
      intensity="strong"
    >
      <AppSidebar
        currentProject={currentProject}
        section={section}
        onSectionChange={setSection}
        onSelectProject={handleSelectProject}
        onNewProject={() => setNewProjectOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar
          currentProject={currentProject}
          section={section}
          onOpenCommand={() => setCommandOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-5">
          {!currentProject ? (
            <div className="flex flex-col items-center gap-8 py-16">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand/10">
                  <DashboardIcon
                    icon={LockIcon}
                    size="lg"
                    className="text-brand"
                  />
                </div>
                <h2 className="font-display text-lg font-semibold">
                  No project selected
                </h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Select a project from the sidebar or create a new one.
                </p>
              </div>

              {recentProjects.length > 0 && (
                <div className="w-full max-w-lg">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Recent
                  </p>
                  <div className="flex flex-col gap-2">
                    {recentProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelectProject(project)}
                        className="group cursor-pointer flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 text-left transition-colors hover:bg-brand/5"
                      >
                        <Avatar className="size-8 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-brand/15 text-xs font-bold text-brand">
                            {project.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {project.name}
                          </p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {project.slug}
                          </p>
                          {project.environments &&
                            project.environments.length > 0 && (
                              <div className="mt-1 flex gap-1">
                                {project.environments.slice(0, 3).map((env) => (
                                  <span
                                    key={env.name}
                                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                                  >
                                    {env.name}
                                  </span>
                                ))}
                                {project.environments.length > 3 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    +{project.environments.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                        <DashboardIcon
                          icon={ArrowRight01Icon}
                          size="sm"
                          className="shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setNewProjectOpen(true)}
              >
                <DashboardIcon
                  icon={PlusSignIcon}
                  size="sm"
                  data-icon="inline-start"
                />
                {recentProjects.length > 0
                  ? 'New project'
                  : 'Create your first project'}
              </Button>
            </div>
          ) : projectDetailQuery.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : projectDetailQuery.isError ? (
            <Empty className="min-h-[40vh] border border-dashed border-destructive/30 bg-destructive/5">
              <EmptyHeader>
                <EmptyTitle>Could not load project</EmptyTitle>
                <EmptyDescription>
                  {projectDetailQuery.error?.message ??
                    'Check your connection and try again.'}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => projectDetailQuery.refetch()}
                >
                  Retry
                </Button>
              </EmptyContent>
            </Empty>
          ) : detail ? (
            <>
              {section === 'secrets' && (
                <SecretsTable
                  projectId={detail.id}
                  environments={detail.environments}
                  projectPlan={currentProject.plan}
                />
              )}

              {section === 'members' && (
                <MembersList
                  projectId={detail.id}
                  currentUserId={meQuery.data?.id ?? ''}
                  currentUserRole={detail.role}
                  orgPlan={currentProject.plan}
                />
              )}

              {section === 'audit' && (
                <AuditLog
                  projectId={detail.id}
                  environments={detail.environments}
                />
              )}

              {section === 'settings' && (
                <ProjectSettings
                  project={{ ...detail, plan: currentProject.plan }}
                  environments={detail.environments}
                  onUpgrade={() => {
                    // TODO: checkout
                  }}
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        currentProject={currentProject}
        section={section}
        onSectionChange={setSection}
        onSelectProject={handleSelectProject}
        onNewProject={() => setNewProjectOpen(true)}
      />

      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSuccess={handleNewProjectSuccess}
      />
    </MeshBackground>
  )
}
