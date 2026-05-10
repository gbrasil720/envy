import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
  useParams
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { AppTopbar } from '@/components/dashboard/app-topbar'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { DashboardActionsContext } from '@/components/dashboard/dashboard-context'
import type {
  DashboardProject,
  DashboardSection
} from '@/components/dashboard/dashboard-types'
import { NewProjectDialog } from '@/components/dashboard/new-project-dialog'
import { MeshBackground } from '@/components/mesh-background'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'

function deriveSection(pathname: string): DashboardSection {
  if (pathname.endsWith('/members')) return 'members'
  if (pathname.endsWith('/audit')) return 'audit'
  if (pathname.endsWith('/settings')) return 'settings'
  return 'secrets'
}

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

  return (
    <DashboardActionsContext
      value={{ openNewProject: () => setNewProjectOpen(true) }}
    >
      <MeshBackground
        className="flex h-screen overflow-hidden"
        intensity="strong"
      >
        <AppSidebar
          currentProject={currentProject}
          section={section}
          onSectionChange={handleSectionChange}
          onSelectProject={handleSelectProject}
          onNewProject={() => setNewProjectOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppTopbar
            currentProject={currentProject}
            section={section}
            onOpenCommand={() => setCommandOpen(true)}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-5">
            <Outlet />
          </main>
        </div>

        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          currentProject={currentProject}
          section={section}
          onSectionChange={handleSectionChange}
          onSelectProject={handleSelectProject}
          onNewProject={() => setNewProjectOpen(true)}
        />

        <NewProjectDialog
          open={newProjectOpen}
          onClose={() => setNewProjectOpen(false)}
          onSuccess={handleNewProjectSuccess}
        />
      </MeshBackground>
    </DashboardActionsContext>
  )
}
