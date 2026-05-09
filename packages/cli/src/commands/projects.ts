import type { Command } from 'commander'
import input from '@inquirer/input'
import { api } from '../lib/api'
import { requireAuth } from '../lib/auth'
import { printWelcomeBanner } from '../lib/banner'
import { EnvyError, EXIT } from '../lib/errors'
import { output } from '../lib/output'

const GREEN = '\x1b[38;2;61;214;140m'
const GRAY = '\x1b[38;5;240m'
const RESET = '\x1b[0m'

const theme = {
  prefix: { idle: `${GREEN}?${RESET}` },
  style: {
    answer: (t: string) => `${GREEN}${t}${RESET}`,
    highlight: (t: string) => `${GREEN}${t}${RESET}`,
    selectedChoice: (t: string) => `${GREEN}${t}${RESET}`
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export type ProjectsOptions = {
  create?: boolean
}

export async function projectsCommand(options: ProjectsOptions): Promise<void> {
  requireAuth()

  printWelcomeBanner()

  if (options.create) {
    const name = await input({
      message: 'Project name:',
      theme,
      validate: (v) => v.trim().length > 0 || 'Name is required'
    })

    output.spinner('Creating project...')

    let created: { id: string; name: string; slug: string }
    try {
      created = await api.projects.create.mutate({ name: name.trim() })
    } catch (err) {
      output.stopSpinner()
      throw EnvyError.from(err, {
        suggestion: 'Check your plan limits or run "envy whoami" to verify auth',
        code: 'PROJECT_CREATE_FAILED',
        exitCode: EXIT.USAGE
      })
    }

    output.stopSpinner()

    const lines = [
      { label: 'Name', value: created.name },
      { label: 'Slug', value: created.slug }
    ]

    const labelWidth = Math.max(...lines.map((l) => l.label.length))
    const valueWidth = Math.max(...lines.map((l) => l.value.length))
    const innerWidth = labelWidth + valueWidth + 6
    const border = '─'.repeat(innerWidth)

    const rows = lines.map(({ label, value }) => {
      const paddedLabel = `${GRAY}${label.padEnd(labelWidth)}${RESET}`
      const paddedValue = `${GREEN}${value.padEnd(valueWidth)}${RESET}`
      return `│  ${paddedLabel}  ${paddedValue}  │`
    })

    output.blank()
    output.raw([`┌${border}┐`, ...rows, `└${border}┘`].join('\n'))
    output.blank()
    output.success(`Project "${created.name}" created`)
    output.dim('Run "envy init" to link a directory to your new project')
    output.blank()
    return
  }

  output.spinner('Fetching projects...')

  let projects: Array<{
    id: string
    name: string
    slug: string
    secretsCount: number
    environments: { name: string }[]
    lastSyncedAt: string | null
    plan: string
  }>

  try {
    projects = await api.projects.list.query()
  } catch (err) {
    output.stopSpinner()
    throw EnvyError.from(err, {
      suggestion: "Run 'envy whoami' to verify your connection",
      code: 'PROJECTS_FETCH_FAILED',
      exitCode: EXIT.NETWORK
    })
  }

  output.stopSpinner()

  if (projects.length === 0) {
    output.blank()
    output.info('No projects found.')
    output.dim('Run "envy projects --create" to create your first project')
    output.blank()
    return
  }

  const rows = projects.map((p) => ({
    name: p.name,
    envs:
      p.environments.length > 0
        ? p.environments.map((e) => e.name).join(', ')
        : '—',
    secrets: `${p.secretsCount} secret${p.secretsCount !== 1 ? 's' : ''}`,
    sync: formatRelativeTime(p.lastSyncedAt)
  }))

  const nameWidth = Math.max(...rows.map((r) => r.name.length), 4)
  const envsWidth = Math.max(...rows.map((r) => r.envs.length), 4)
  const secretsWidth = Math.max(...rows.map((r) => r.secrets.length), 7)
  const syncWidth = Math.max(...rows.map((r) => r.sync.length), 9)

  // │  name  envs  secrets  sync  │
  // inner = 2 + nameWidth + 2 + envsWidth + 2 + secretsWidth + 2 + syncWidth + 2
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
