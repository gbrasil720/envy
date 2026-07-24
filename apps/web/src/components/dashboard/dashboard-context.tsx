import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'
import type { DashboardProject, DashboardSection } from './dashboard-types'

type DashboardActions = {
  openNewProject: () => void
  openAddSecret: (() => void) | null
  registerOpenAddSecret: (fn: (() => void) | null) => void
}

type DashboardShell = {
  organizationSlug: string
  organizationId: string
  canManageProjects: boolean
  currentProject: DashboardProject | null
  section: DashboardSection
  isHome: boolean
  onSectionChange: (s: DashboardSection) => void
  onSelectProject: (p: DashboardProject) => void
  onNewProject: () => void
  onGoHome: () => void
}

const DashboardActionsContext = createContext<DashboardActions>({
  openNewProject: () => {},
  openAddSecret: null,
  registerOpenAddSecret: () => {}
})

const DashboardShellContext = createContext<DashboardShell | null>(null)

export function useDashboardActions() {
  return useContext(DashboardActionsContext)
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext)
  if (!context) {
    throw new Error(
      'useDashboardShell must be used inside DashboardShellProvider'
    )
  }
  return context
}

export function DashboardActionsProvider({
  openNewProject,
  children
}: {
  openNewProject: () => void
  children: ReactNode
}) {
  const [openAddSecret, setOpenAddSecret] = useState<(() => void) | null>(null)

  const registerOpenAddSecret = useCallback((fn: (() => void) | null) => {
    setOpenAddSecret(() => fn)
  }, [])

  const value = useMemo(
    () => ({
      openNewProject,
      openAddSecret,
      registerOpenAddSecret
    }),
    [openNewProject, openAddSecret, registerOpenAddSecret]
  )

  return (
    <DashboardActionsContext value={value}>{children}</DashboardActionsContext>
  )
}

export function DashboardShellProvider({
  organizationSlug,
  organizationId,
  canManageProjects,
  currentProject,
  section,
  isHome,
  onSectionChange,
  onSelectProject,
  onNewProject,
  onGoHome,
  children
}: DashboardShell & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      organizationSlug,
      organizationId,
      canManageProjects,
      currentProject,
      section,
      isHome,
      onSectionChange,
      onSelectProject,
      onNewProject,
      onGoHome
    }),
    [
      organizationSlug,
      organizationId,
      canManageProjects,
      currentProject,
      section,
      isHome,
      onSectionChange,
      onSelectProject,
      onNewProject,
      onGoHome
    ]
  )

  return <DashboardShellContext value={value}>{children}</DashboardShellContext>
}

export { DashboardActionsContext, DashboardShellContext }
