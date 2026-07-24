import type { Plan } from '@envy/api/lib/plan-limits'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useParams
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { AppTopbar } from '@/components/dashboard/app-topbar'
import { CommandPalette } from '@/components/dashboard/command-palette'
import {
  DashboardActionsProvider,
  DashboardShellProvider
} from '@/components/dashboard/dashboard-context'
import type {
  DashboardProject,
  DashboardSection
} from '@/components/dashboard/dashboard-types'
import { NewProjectDialog } from '@/components/dashboard/new-project-dialog'
import { requireWebAuth } from '@/functions/require-web-auth'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'

function sectionFromPath(pathname: string): DashboardSection {
  if (/\/projects\/[^/]+\/?$/.test(pathname)) return 'projectSettings'
  if (pathname.endsWith('/settings/members')) return 'members'
  if (pathname.endsWith('/settings/billing')) return 'billing'
  if (pathname.endsWith('/settings/audit-log')) return 'audit'
  if (/\/settings\/?$/.test(pathname)) return 'organization'
  return 'secrets'
}

export const Route = createFileRoute('/org/$orgSlug')({
  beforeLoad: async () => {
    await requireWebAuth('onboarding-required')
  },
  head: () => ({
    meta: [
      { title: 'Organization — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: OrganizationLayout
})

function OrganizationLayout() {
  const { orgSlug } = Route.useParams()
  const { projectSlug } = useParams({ strict: false }) as {
    projectSlug?: string
  }
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const trpc = useTRPC()
  const { data: activeOrganization, isPending: activePending } =
    authClient.useActiveOrganization()
  const { data: activeMember } = authClient.useActiveMember()
  const { data: organizations, isPending: organizationsPending } =
    authClient.useListOrganizations()
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const routeOrganization = organizations?.find((org) => org.slug === orgSlug)
  const personalOrganization = organizations?.find(
    (org) => org.type === 'personal'
  )
  const organizationId = routeOrganization?.id ?? ''
  const isActiveRoute = activeOrganization?.id === organizationId
  const projectsQuery = useQuery({
    ...trpc.projects.list.queryOptions({ organizationId }),
    enabled: !!organizationId && isActiveRoute
  })
  const listedCurrentProject =
    projectsQuery.data?.find((project) => project.slug === projectSlug) ?? null
  const billingQuery = useQuery({
    ...trpc.billing.status.queryOptions({ organizationId }),
    enabled: !!organizationId && isActiveRoute
  })

  useEffect(() => {
    if (organizationsPending || activePending) return

    if (!routeOrganization) {
      if (!personalOrganization) return
      void authClient.organization
        .setActive({ organizationSlug: personalOrganization.slug })
        .finally(() => {
          void navigate({
            to: '/org/$orgSlug',
            params: { orgSlug: personalOrganization.slug },
            replace: true
          })
        })
      return
    }

    if (!isActiveRoute) {
      void authClient.organization.setActive({
        organizationSlug: routeOrganization.slug
      })
    }
  }, [
    activePending,
    isActiveRoute,
    navigate,
    organizationsPending,
    personalOrganization,
    routeOrganization
  ])

  useEffect(() => {
    if (
      !projectsQuery.isError ||
      projectsQuery.error.message !== 'Organization not found' ||
      !personalOrganization ||
      personalOrganization.slug === orgSlug
    ) {
      return
    }

    void authClient.organization
      .setActive({ organizationSlug: personalOrganization.slug })
      .finally(() => {
        void navigate({
          to: '/org/$orgSlug',
          params: { orgSlug: personalOrganization.slug },
          replace: true
        })
      })
  }, [
    navigate,
    orgSlug,
    personalOrganization,
    projectsQuery.error,
    projectsQuery.isError
  ])

  if (
    organizationsPending ||
    activePending ||
    !routeOrganization ||
    !isActiveRoute
  ) {
    return <div className="h-dvh bg-bg" />
  }

  const currentProject = listedCurrentProject
    ? {
        ...listedCurrentProject,
        plan: (billingQuery.data?.plan ?? 'free') as Plan
      }
    : null
  const section = sectionFromPath(pathname)
  const isHome = !projectSlug && section === 'secrets'
  const canManageProjects = Boolean(
    activeMember?.role.includes('owner') || activeMember?.role.includes('admin')
  )

  function openNewProject() {
    if (canManageProjects) setNewProjectOpen(true)
  }

  function selectProject(project: DashboardProject) {
    void navigate({
      to: '/org/$orgSlug/projects/$projectSlug/secrets',
      params: { orgSlug, projectSlug: project.slug }
    })
  }

  function selectSection(nextSection: DashboardSection) {
    const destinations: Record<
      Exclude<DashboardSection, 'secrets' | 'projectSettings'>,
      string
    > = {
      organization: '/org/$orgSlug/settings',
      members: '/org/$orgSlug/settings/members',
      billing: '/org/$orgSlug/settings/billing',
      audit: '/org/$orgSlug/settings/audit-log'
    }
    if (nextSection === 'secrets') {
      if (currentProject) selectProject(currentProject)
      else void navigate({ to: '/org/$orgSlug', params: { orgSlug } })
      return
    }
    if (nextSection === 'projectSettings') {
      if (!currentProject) return
      void navigate({
        to: '/org/$orgSlug/projects/$projectSlug',
        params: { orgSlug, projectSlug: currentProject.slug }
      })
      return
    }
    void navigate({
      to: destinations[nextSection] as never,
      params: { orgSlug } as never
    })
  }

  return (
    <DashboardActionsProvider openNewProject={openNewProject}>
      <DashboardShellProvider
        organizationSlug={orgSlug}
        organizationId={organizationId}
        canManageProjects={canManageProjects}
        currentProject={currentProject}
        section={section}
        isHome={isHome}
        onSectionChange={selectSection}
        onSelectProject={selectProject}
        onNewProject={openNewProject}
        onGoHome={() =>
          void navigate({ to: '/org/$orgSlug', params: { orgSlug } })
        }
      >
        <div className="flex h-dvh overflow-hidden bg-bg text-text-primary">
          <AppSidebar
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppTopbar
              onOpenCommand={() => setCommandOpen(true)}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          {canManageProjects ? (
            <NewProjectDialog
              open={newProjectOpen}
              onClose={() => setNewProjectOpen(false)}
              organizationId={organizationId}
              onSuccess={(project) =>
                void navigate({
                  to: '/org/$orgSlug/projects/$projectSlug/secrets',
                  params: { orgSlug, projectSlug: project.slug }
                })
              }
            />
          ) : null}
        </div>
      </DashboardShellProvider>
    </DashboardActionsProvider>
  )
}
