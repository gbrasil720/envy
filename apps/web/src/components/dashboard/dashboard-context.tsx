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

const DashboardShellContext = createContext<DashboardShell>(
  null! as DashboardShell
)

export function useDashboardActions() {
  return useContext(DashboardActionsContext)
}

export function useDashboardShell() {
  return useContext(DashboardShellContext)
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
      currentProject,
      section,
      isHome,
      onSectionChange,
      onSelectProject,
      onNewProject,
      onGoHome
    }),
    [
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
