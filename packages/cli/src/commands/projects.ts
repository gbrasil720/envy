import input from '@inquirer/input'
import type { Command } from 'commander'
import { printWelcomeBanner } from '../core/banner'
import {
  formatInfoBox,
  formatRelativeTime,
  sanitizeForTerminal
} from '../core/format'
import { output } from '../core/output'
import { createProject, listProjects } from '../core/services/projects'
import { GRAY, GREEN, inquirerTheme, RESET } from '../core/theme'

export type ProjectsOptions = {
  create?: boolean
}

export async function projectsCommand(options: ProjectsOptions): Promise<void> {
  printWelcomeBanner()

  if (options.create) {
    const name = await input({
      message: 'Project name:',
      theme: inquirerTheme,
      validate: (v) => v.trim().length > 0 || 'Name is required'
    })

    const created = await createProject(name, {
      onCreating: () => output.spinner('Creating project...'),
      onDone: () => output.stopSpinner()
    })

    output.blank()
    output.raw(
      formatInfoBox([
        { label: 'Name', value: created.name },
        { label: 'Slug', value: created.slug }
      ])
    )
    output.blank()
    output.success(`Project "${created.name}" created`)
    output.dim('Run "envy init" to link a directory to your new project')
    output.blank()
    return
  }

  const projects = await listProjects({
    onFetching: () => output.spinner('Fetching projects...'),
    onDone: () => output.stopSpinner()
  })

  if (projects.length === 0) {
    output.blank()
    output.info('No projects found.')
    output.dim('Run "envy projects --create" to create your first project')
    output.blank()
    return
  }

  const rows = projects.map((p) => ({
    name: sanitizeForTerminal(p.name),
    envs:
      p.environments.length > 0
        ? p.environments.map((e) => sanitizeForTerminal(e.name)).join(', ')
        : '—',
    secrets: `${p.secretsCount} secret${p.secretsCount !== 1 ? 's' : ''}`,
    sync: formatRelativeTime(p.lastSyncedAt)
  }))

  const nameWidth = Math.max(...rows.map((r) => r.name.length), 4)
  const envsWidth = Math.max(...rows.map((r) => r.envs.length), 4)
  const secretsWidth = Math.max(...rows.map((r) => r.secrets.length), 7)
  const syncWidth = Math.max(...rows.map((r) => r.sync.length), 9)
  const innerWidth = nameWidth + envsWidth + secretsWidth + syncWidth + 10
  const border = '─'.repeat(innerWidth)

  const boxLines: string[] = [`┌${border}┐`]
  for (const r of rows) {
    const name = `${GREEN}${r.name.padEnd(nameWidth)}${RESET}`
    const envs = `${GRAY}${r.envs.padEnd(envsWidth)}${RESET}`
    const secrets = `${GREEN}${r.secrets.padEnd(secretsWidth)}${RESET}`
    const sync = `${GRAY}${r.sync.padEnd(syncWidth)}${RESET}`
    boxLines.push(`│  ${name}  ${envs}  ${secrets}  ${sync}  │`)
  }
  boxLines.push(`└${border}┘`)

  output.blank()
  output.raw(boxLines.join('\n'))
  output.blank()
  output.success(
    `${projects.length} project${projects.length !== 1 ? 's' : ''}`
  )
  output.dim(
    'Run "envy init" to link a directory  ·  "envy projects --create" to add a project'
  )
  output.blank()
}

export function registerProjects(program: Command): void {
  program
    .command('projects')
    .description('List your Envy projects')
    .option('--create', 'Create a new project')
    .action(async (options: ProjectsOptions) => {
      await projectsCommand(options)
    })
}
