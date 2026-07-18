import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import select from '@inquirer/select'
import type { Command } from 'commander'
import { printWelcomeBanner } from '../core/banner'
import { formatInfoBox } from '../core/format'
import { output } from '../core/output'
import { runPull } from '../core/services/pull'
import { GRAY, inquirerTheme, RESET } from '../core/theme'

export type PullOptions = {
  env?: string
  yes?: boolean
  output?: string
}

export async function pullCommand(options: PullOptions): Promise<void> {
  printWelcomeBanner()

  await runPull(options, {
    promptNewFilename: () =>
      input({
        message: 'No .env files found. Enter filename to create:',
        default: '.env.local',
        theme: inquirerTheme,
        validate: (v) =>
          /^\.env(\..+)?$/.test(v.trim()) || 'Must be a valid .env filename'
      }),
    selectTarget: (files) =>
      select({
        message: 'Write secrets to:',
        theme: inquirerTheme,
        choices: [
          ...files.map((f) => ({ name: f, value: f })),
          { name: `${GRAY}+ Create new file${RESET}`, value: '__new__' }
        ]
      }),
    confirmKeepLocal: async () =>
      confirm({
        message: 'Keep local-only keys? (No = overwrite completely)',
        default: true,
        theme: inquirerTheme
      }),
    confirmOverwrite: (file) =>
      confirm({
        message: `Overwrite "${file}"?`,
        default: true,
        theme: inquirerTheme
      }),
    onSpinner: (msg) => output.spinner(msg),
    onStopSpinner: () => output.stopSpinner(),
    onEmpty: (environment) => {
      output.blank()
      output.info(`No secrets found in "${environment}"`)
      output.dim('Run "envy push" to upload your secrets first')
    },
    onLocalOnly: (file, keys) => {
      output.blank()
      output.raw(
        `  ${GRAY}"${file}" has ${keys.length} local key(s) not in remote:${RESET}`
      )
      for (const key of keys) {
        output.raw(`${GRAY}    · ${key}${RESET}`)
      }
      output.blank()
    },
    onAbort: (reason) => output.info(reason),
    onSuccess: (summary) => {
      output.blank()
      output.raw(
        formatInfoBox([
          { label: 'Project', value: summary.projectSlug },
          { label: 'Environment', value: summary.environment },
          { label: 'Secrets', value: `${summary.secretsCount} pulled` },
          { label: 'File', value: summary.file }
        ])
      )
      output.blank()
      output.success('Secrets pulled successfully')
      output.dim('Run "envy push" to sync changes back')
    }
  })
}

export function registerPull(program: Command): void {
  program
    .command('pull')
    .description('Pull secrets from Envy to a local .env file')
    .option('--env <environment>', 'Source environment (overrides .envy.json)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-o, --output <file>', 'Target .env file')
    .action(async (options: PullOptions) => {
      await pullCommand(options)
    })
}
