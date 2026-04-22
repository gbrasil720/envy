import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import select from '@inquirer/select'
import type { Command } from 'commander'
import { api } from '../lib/api'
import { requireAuth } from '../lib/auth'
import { printWelcomeBanner } from '../lib/banner'
import { CONFIG_FILENAME } from '../lib/constants'
import { EnvyError, EXIT } from '../lib/errors'
import { output } from '../lib/output'

const theme = {
  prefix: { idle: '\x1b[38;2;61;214;140m?\x1b[0m' },
  style: {
    answer: (t: string) => `\x1b[38;2;61;214;140m${t}\x1b[0m`,
    highlight: (t: string) => `\x1b[38;2;61;214;140m${t}\x1b[0m`,
    selectedChoice: (t: string) => `\x1b[38;2;61;214;140m${t}\x1b[0m`
  }
}

export type EnvyConfig = {
  project_id: string
  project_slug: string
  environment: string
}

export type InitOptions = {
  create?: boolean
}

export async function initCommand(options: InitOptions): Promise<void> {
  requireAuth()

  printWelcomeBanner()

  const configPath = join(process.cwd(), CONFIG_FILENAME)
  if (existsSync(configPath)) {
    const overwrite = await confirm({
      message: `${CONFIG_FILENAME} already exists. Overwrite?`,
      default: false,
      theme
    })
    if (!overwrite) {
      output.info('Aborted.')
      return
    }
  }

  let projectId: string
  let projectSlug: string
  let projectName: string

  if (options.create) {
    const name = await input({
      message: 'Project name:',
      theme,
      validate: (v) => v.trim().length > 0 || 'Name is required'
    })

    output.spinner('Creating project...')
    const created = await api.projects.create.mutate({ name: name.trim() })
    output.stopSpinner()

    projectId = created?.id ?? ''
    projectSlug = created?.slug ?? ''
    projectName = created?.name ?? ''
  } else {
    output.spinner('Fetching projects...')
    const projects = await api.projects.list.query()
    output.stopSpinner()

    if (projects.length === 0) {
      throw new EnvyError('No projects found', {
        suggestion: 'Run "envy init --create" to create your first project',
        code: 'NO_PROJECTS',
        exitCode: EXIT.USAGE
      })
    }

    const selected = await select({
      message: 'Select a project:',
      theme,
      choices: projects.map((p) => ({
        name:
          p.name === p.slug
            ? p.name
            : `${p.name}  \x1b[38;5;240m${p.slug}\x1b[0m`,
        value: p
      }))
    })

    projectId = selected.id
    projectSlug = selected.slug
    projectName = selected.name
  }

  const environment = await select({
    message: 'Default environment:',
    theme,
    choices: [
      { name: 'development', value: 'development' },
      { name: 'staging', value: 'staging' },
      { name: 'production', value: 'production' }
    ]
  })

  const config: EnvyConfig = {
    project_id: projectId,
    project_slug: projectSlug,
    environment
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

  const gitignorePath = join(process.cwd(), '.gitignore')
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8')
    if (!gitignore.includes(CONFIG_FILENAME)) {
      appendFileSync(gitignorePath, `\n${CONFIG_FILENAME}\n`)
      output.dim(`Added ${CONFIG_FILENAME} to .gitignore`)
    } else {
      output.dim(`${CONFIG_FILENAME} already in .gitignore`)
    }
  } else {
    output.warn(
      `No .gitignore found — add ${CONFIG_FILENAME} manually to avoid committing it`
    )
  }

  const lines = [
    { label: 'Project', value: projectName },
    { label: 'Slug', value: projectSlug },
    { label: 'Environment', value: environment }
  ]

  const labelWidth = Math.max(...lines.map((l) => l.label.length))
  const valueWidth = Math.max(...lines.map((l) => l.value.length))
  const innerWidth = labelWidth + valueWidth + 6
  const border = '─'.repeat(innerWidth)

  const rows = lines.map(({ label, value }) => {
    const paddedLabel = `\x1b[38;5;240m${label.padEnd(labelWidth)}\x1b[0m`
    const paddedValue = `\x1b[38;2;61;214;140m${value.padEnd(valueWidth)}\x1b[0m`
    return `│  ${paddedLabel}  ${paddedValue}  │`
  })

  output.blank()
  output.raw([`┌${border}┐`, ...rows, `└${border}┘`].join('\n'))
  output.blank()
  output.success('Directory linked to Envy')
  output.dim('Run "envy pull" to sync your secrets')
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Link this directory to an Envy project')
    .option('--create', 'Create a new project')
    .action(async (options: InitOptions) => {
      await initCommand(options)
    })
}
