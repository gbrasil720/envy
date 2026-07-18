import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { requireAuth } from '../auth'
import { CONFIG_FILENAME } from '../constants'
import { EnvyError, EXIT } from '../errors'
import { createProject, listProjects, type ProjectRow } from './projects'

export type EnvyConfig = {
  project_id: string
  project_slug: string
  environment: string
}

export type InitOptions = {
  create?: boolean
  cwd?: string
}

export type InitResult = {
  projectName: string
  projectSlug: string
  environment: string
  gitignoreNote: 'added' | 'already' | 'missing'
}

export type InitUI = {
  confirmOverwrite: () => Promise<boolean>
  promptProjectName: () => Promise<string>
  selectProject: (projects: ProjectRow[]) => Promise<ProjectRow>
  selectEnvironment: () => Promise<string>
  onFetching?: () => void
  onCreating?: () => void
  onDone?: () => void
}

export async function runInit(
  options: InitOptions,
  ui: InitUI
): Promise<InitResult | null> {
  requireAuth()
  const cwd = options.cwd ?? process.cwd()
  const configPath = join(cwd, CONFIG_FILENAME)

  if (existsSync(configPath)) {
    const overwrite = await ui.confirmOverwrite()
    if (!overwrite) return null
  }

  let projectId: string
  let projectSlug: string
  let projectName: string

  if (options.create) {
    const name = await ui.promptProjectName()
    ui.onCreating?.()
    const created = await createProject(name)
    ui.onDone?.()
    projectId = created?.id ?? ''
    projectSlug = created?.slug ?? ''
    projectName = created?.name ?? ''
  } else {
    ui.onFetching?.()
    const projects = await listProjects()
    ui.onDone?.()

    if (projects.length === 0) {
      throw new EnvyError('No projects found', {
        suggestion: 'Run "envy init --create" to create your first project',
        code: 'NO_PROJECTS',
        exitCode: EXIT.USAGE
      })
    }

    const selected = await ui.selectProject(projects)
    projectId = selected.id
    projectSlug = selected.slug
    projectName = selected.name
  }

  const environment = await ui.selectEnvironment()

  const config: EnvyConfig = {
    project_id: projectId,
    project_slug: projectSlug,
    environment
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

  const gitignoreNote = appendConfigToGitignore(cwd)

  return {
    projectName,
    projectSlug,
    environment,
    gitignoreNote
  }
}

function appendConfigToGitignore(cwd: string): InitResult['gitignoreNote'] {
  const gitignorePath = join(cwd, '.gitignore')
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8')
    if (!gitignore.includes(CONFIG_FILENAME)) {
      appendFileSync(gitignorePath, `\n${CONFIG_FILENAME}\n`)
      return 'added'
    }
    return 'already'
  }
  return 'missing'
}
