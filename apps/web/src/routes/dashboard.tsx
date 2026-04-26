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
import { Separator } from '@envy/ui/components/separator'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  ArrowRight01Icon,
  Copy01Icon,
  PlusSignIcon,
  TerminalIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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

export const Route = createFileRoute('/dashboard')({
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

  function copyCmd(cmd: string) {
    void navigator.clipboard.writeText(cmd).then(
      () => toast.success('Copied'),
      () => toast.error('Could not copy')
    )
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

              {/* Two-column layout: projects + quick start */}
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
                {/* Projects panel */}
                <div className="min-w-0 flex-1">
                  {projectsQuery.isLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 2 }).map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
                        <Skeleton key={i} className="h-[88px] rounded-xl" />
                      ))}
                    </div>
                  ) : projectsQuery.data && projectsQuery.data.length > 0 ? (
                    <div
                      className="grid gap-3 sm:grid-cols-2"
                      role="list"
                      aria-label="Projects"
                    >
                      {projectsQuery.data.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          role="listitem"
                          onClick={() => handleSelectProject(project)}
                          aria-label={`Open project ${project.name}`}
                          className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/80 p-4 text-left backdrop-blur-sm transition-all duration-150 hover:border-brand/20 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
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
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty className="border border-dashed border-border/60">
                      <EmptyHeader>
                        <EmptyTitle>No projects yet</EmptyTitle>
                        <EmptyDescription>
                          Create your first project to start managing secrets.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
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
                          Create first project
                        </Button>
                      </EmptyContent>
                    </Empty>
                  )}
                </div>

                {/* Quick start panel */}
                <div className="shrink-0 lg:sticky lg:top-4 lg:w-64">
                  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
                    <div>
                      <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Quick start
                      </p>
                      <ol className="flex flex-col gap-3">
                        {(
                          [
                            'Select a project from the list',
                            'Add secrets per environment',
                            'Sync locally with the CLI'
                          ] as const
                        ).map((step, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[10px] font-bold text-brand">
                              {i + 1}
                            </span>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {step}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <Separator />

                    <div>
                      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        <DashboardIcon
                          icon={TerminalIcon}
                          size="xs"
                          className="text-muted-foreground"
                        />
                        CLI reference
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {(
                          [
                            { label: 'Push secrets', cmd: 'envy push' },
                            { label: 'Pull secrets', cmd: 'envy pull' }
                          ] as const
                        ).map(({ label, cmd }) => (
                          <div
                            key={cmd}
                            className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-[9px] text-muted-foreground">
                                {label}
                              </p>
                              <code className="font-mono text-[11px] text-foreground">
                                {cmd}
                              </code>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyCmd(cmd)}
                              aria-label={`Copy ${cmd}`}
                              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <DashboardIcon icon={Copy01Icon} size="xs" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
