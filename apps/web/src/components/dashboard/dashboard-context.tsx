import { createContext, useContext } from 'react'

type DashboardActions = {
  openNewProject: () => void
}

const DashboardActionsContext = createContext<DashboardActions>({
  openNewProject: () => {}
})

export function useDashboardActions() {
  return useContext(DashboardActionsContext)
}

export { DashboardActionsContext }
