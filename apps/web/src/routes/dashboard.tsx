import { Avatar, AvatarFallback } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@envy/ui/components/empty'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  ArrowRight01Icon,
  FolderAddIcon,
  PlusSignIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
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
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'

function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return 'No activity'
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'Just now'
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

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  beforeLoad: async ({ context }) => {
    if (typeof window === 'undefined') {
      return
    }

    const { data: session } = await authClient.getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    const me = await context.queryClient.fetchQuery(
      context.trpc.me.get.queryOptions()
    )

    if (!me.onboardingCompletedAt && !me.onboardingSkippedAt) {
      throw redirect({ to: '/onboarding' })
    }
  },
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
    navigate({ search: { project: project.slug, section: 'secrets' } })
  }

  function handleNewProjectSuccess(project: {
    id: string
    name: string
    slug: string
  }) {
    navigate({ search: { project: project.slug, section: 'secrets' } })
  }

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
            projectsQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
                  <Skeleton key={i} className="h-[72px] rounded-xl" />
                ))}
              </div>
            ) : (projectsQuery.data?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
                  <DashboardIcon
                    icon={FolderAddIcon}
                    size="lg"
                    className="text-muted-foreground"
                  />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    No projects yet
                  </h2>
                  <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Create your first project to start managing secrets across
                    environments.
                  </p>
                </div>
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
                  New project
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      All projects
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Select a project to manage its secrets and settings.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => setNewProjectOpen(true)}
                  >
                    <DashboardIcon
                      icon={PlusSignIcon}
                      size="sm"
                      data-icon="inline-start"
                    />
                    New project
                  </Button>
                </div>

                {(projectsQuery.data?.length ?? 0) <= 3 ? (
                  /* List layout — 1–3 projects */
                  <div
                    className="flex flex-col gap-2"
                    role="list"
                    aria-label="Projects"
                  >
                    {projectsQuery.data?.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        role="listitem"
                        onClick={() => handleSelectProject(project)}
                        aria-label={`Open project ${project.name}`}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3.5 text-left backdrop-blur-sm transition-all duration-150 hover:border-brand/20 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Avatar className="size-9 shrink-0 rounded-xl">
                          <AvatarFallback className="rounded-xl bg-brand/15 text-sm font-bold text-brand">
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
                        </div>

                        {project.environments &&
                          project.environments.length > 0 && (
                            <div className="hidden items-center gap-1 sm:flex">
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

                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {project.secretsCount ?? 0} secrets
                          </span>
                        </div>

                        <span className="hidden shrink-0 text-[10px] text-muted-foreground md:block">
                          {formatRelativeTime(project.lastSyncedAt)}
                        </span>

                        <DashboardIcon
                          icon={ArrowRight01Icon}
                          size="sm"
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Grid layout — 4+ projects */
                  <div
                    className="grid gap-3 sm:grid-cols-2"
                    role="list"
                    aria-label="Projects"
                  >
                    {projectsQuery.data?.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        role="listitem"
                        onClick={() => handleSelectProject(project)}
                        aria-label={`Open project ${project.name}`}
                        className="group flex cursor-pointer flex-col rounded-xl border border-border bg-card/80 text-left backdrop-blur-sm transition-all duration-150 hover:border-brand/20 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div className="flex items-start gap-3 p-4">
                          <Avatar className="size-9 shrink-0 rounded-xl">
                            <AvatarFallback className="rounded-xl bg-brand/15 text-sm font-bold text-brand">
                              {project.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">
                                {project.name}
                              </p>
                              <Badge
                                className={`${dashboardPlanBadgeClass(project.plan)} shrink-0`}
                              >
                                {project.plan.charAt(0).toUpperCase() +
                                  project.plan.slice(1)}
                              </Badge>
                            </div>
                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                              {project.slug}
                            </p>
                            {project.environments &&
                              project.environments.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {project.environments
                                    .slice(0, 3)
                                    .map((env) => (
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
                            className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {project.secretsCount ?? 0} secrets
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(project.lastSyncedAt)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
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
