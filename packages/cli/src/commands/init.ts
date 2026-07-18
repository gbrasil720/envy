import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import select from '@inquirer/select'
import type { Command } from 'commander'
import { printWelcomeBanner } from '../core/banner'
import { CONFIG_FILENAME } from '../core/constants'
import { formatInfoBox } from '../core/format'
import { output } from '../core/output'
import { runInit } from '../core/services/init'
import { GRAY, inquirerTheme, RESET } from '../core/theme'

export type InitOptions = {
  create?: boolean
}

export async function initCommand(options: InitOptions): Promise<void> {
  printWelcomeBanner()

  const result = await runInit(options, {
    confirmOverwrite: () =>
      confirm({
        message: `${CONFIG_FILENAME} already exists. Overwrite?`,
        default: false,
        theme: inquirerTheme
      }),
    promptProjectName: () =>
      input({
        message: 'Project name:',
        theme: inquirerTheme,
        validate: (v) => v.trim().length > 0 || 'Name is required'
      }),
    selectProject: (projects) =>
      select({
        message: 'Select a project:',
        theme: inquirerTheme,
        choices: projects.map((p) => ({
          name:
            p.name === p.slug ? p.name : `${p.name}  ${GRAY}${p.slug}${RESET}`,
          value: p
        }))
      }),
    selectEnvironment: () =>
      select({
        message: 'Default environment:',
        theme: inquirerTheme,
        choices: [
          { name: 'development', value: 'development' },
          { name: 'staging', value: 'staging' },
          { name: 'production', value: 'production' }
        ]
      }),
    onFetching: () => output.spinner('Fetching projects...'),
    onCreating: () => output.spinner('Creating project...'),
    onDone: () => output.stopSpinner()
  })

  if (!result) {
    output.info('Aborted.')
    return
  }

  if (result.gitignoreNote === 'added') {
    output.dim(`Added ${CONFIG_FILENAME} to .gitignore`)
  } else if (result.gitignoreNote === 'already') {
    output.dim(`${CONFIG_FILENAME} already in .gitignore`)
  } else {
    output.warn(
      `No .gitignore found — add ${CONFIG_FILENAME} manually to avoid committing it`
    )
  }

  output.blank()
  output.raw(
    formatInfoBox([
      { label: 'Project', value: result.projectName },
      { label: 'Slug', value: result.projectSlug },
      { label: 'Environment', value: result.environment }
    ])
  )
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
