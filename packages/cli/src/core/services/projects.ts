import { api } from '../api'
import { requireAuth } from '../auth'
import { EnvyError, EXIT } from '../errors'

export type ProjectRow = {
  id: string
  name: string
  slug: string
  secretsCount: number
  environments: { name: string }[]
  lastSyncedAt: string | null
  plan: string
}

export type ProjectsUI = {
  onFetching?: () => void
  onCreating?: () => void
  onDone?: () => void
}

export async function listProjects(ui: ProjectsUI = {}): Promise<ProjectRow[]> {
  requireAuth()
  ui.onFetching?.()
  try {
    const projects = await api.projects.list.query({})
    ui.onDone?.()
    return projects as ProjectRow[]
  } catch (err) {
    ui.onDone?.()
    throw EnvyError.from(err, {
      suggestion: "Run 'envy whoami' to verify your connection",
      code: 'PROJECTS_FETCH_FAILED',
      exitCode: EXIT.NETWORK
    })
  }
}

export async function createProject(
  name: string,
  ui: ProjectsUI = {}
): Promise<{ id: string; name: string; slug: string }> {
  requireAuth()
  ui.onCreating?.()
  try {
    const created = await api.projects.create.mutate({ name: name.trim() })
    ui.onDone?.()
    return created
  } catch (err) {
    ui.onDone?.()
    throw EnvyError.from(err, {
      suggestion: 'Check your plan limits or run "envy whoami" to verify auth',
      code: 'PROJECT_CREATE_FAILED',
      exitCode: EXIT.USAGE
    })
  }
}
