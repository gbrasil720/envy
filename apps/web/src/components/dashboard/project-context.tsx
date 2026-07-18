import type { AppRouter } from '@envy/api/routers/index'
import type { inferRouterOutputs } from '@trpc/server'
import { createContext, useContext } from 'react'

export type CurrentProject = inferRouterOutputs<AppRouter>['projects']['get']

const ProjectContext = createContext<CurrentProject | null>(null)

export function ProjectProvider({
  project,
  children
}: {
  project: CurrentProject
  children: React.ReactNode
}) {
  return (
    <ProjectContext.Provider value={project}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useCurrentProject(): CurrentProject {
  const project = useContext(ProjectContext)
  if (!project) {
    throw new Error('useCurrentProject must be used within ProjectProvider')
  }
  return project
}
