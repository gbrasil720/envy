import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

type DashboardActions = {
  openNewProject: () => void
  openAddSecret: (() => void) | null
  registerOpenAddSecret: (fn: (() => void) | null) => void
}

const DashboardActionsContext = createContext<DashboardActions>({
  openNewProject: () => {},
  openAddSecret: null,
  registerOpenAddSecret: () => {}
})

export function useDashboardActions() {
  return useContext(DashboardActionsContext)
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

export { DashboardActionsContext }
