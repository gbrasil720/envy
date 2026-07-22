import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useParams
} from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
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
import { useTRPC } from '@/utils/trpc'

function deriveSection(pathname: string): DashboardSection {
  if (pathname.endsWith('/members')) return 'members'
  if (pathname.endsWith('/audit')) return 'audit'
  if (pathname.endsWith('/settings')) return 'settings'
  return 'secrets'
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    await requireWebAuth('onboarding-required')
  },
  head: () => ({
    meta: [
      { title: 'Dashboard — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: DashboardLayout
})

function DashboardLayout() {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const { projectSlug } = useParams({ strict: false }) as {
    projectSlug?: string
  }
  const { pathname } = useLocation()
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const currentProject =
    projectsQuery.data?.find((p) => p.slug === projectSlug) ?? null
  const section = deriveSection(pathname)
  const isHome = !projectSlug

  const openNewProject = useCallback(() => setNewProjectOpen(true), [])

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

  function handleSelectProject(project: DashboardProject) {
    navigate({
      to: '/dashboard/$projectSlug/secrets',
      params: { projectSlug: project.slug }
    })
  }

  function handleNewProjectSuccess(project: {
    id: string
    name: string
    slug: string
  }) {
    setNewProjectOpen(false)
    navigate({
      to: '/dashboard/$projectSlug/secrets',
      params: { projectSlug: project.slug }
    })
  }

  function handleSectionChange(s: DashboardSection) {
    if (!currentProject) return
    const routes: Record<DashboardSection, string> = {
      secrets: '/dashboard/$projectSlug/secrets',
      members: '/dashboard/$projectSlug/members',
      audit: '/dashboard/$projectSlug/audit',
      settings: '/dashboard/$projectSlug/settings'
    }
    navigate({
      to: routes[s] as any,
      params: { projectSlug: currentProject.slug } as any
    })
  }

  function goHome() {
    navigate({
      to: '/dashboard',
      search: { project: '', section: 'secrets' as const }
    })
  }

  return (
    <DashboardActionsProvider openNewProject={openNewProject}>
      <DashboardShellProvider
        currentProject={currentProject}
        section={section}
        isHome={isHome}
        onSectionChange={handleSectionChange}
        onSelectProject={handleSelectProject}
        onNewProject={openNewProject}
        onGoHome={goHome}
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

          <NewProjectDialog
            open={newProjectOpen}
            onClose={() => setNewProjectOpen(false)}
            onSuccess={handleNewProjectSuccess}
          />
        </div>
      </DashboardShellProvider>
    </DashboardActionsProvider>
  )
}
