import checkbox from '@inquirer/checkbox'
import confirm from '@inquirer/confirm'
import type { Command } from 'commander'
import { printWelcomeBanner } from '../core/banner'
import { maskSecret } from '../core/env-files'
import { formatInfoBox } from '../core/format'
import { output } from '../core/output'
import { runPush, type SecretsDiff } from '../core/services/push'
import {
  GRAY,
  GREEN,
  GREEN_STD,
  inquirerTheme,
  RESET,
  YELLOW
} from '../core/theme'

export type PushOptions = {
  env?: string
  yes?: boolean
}

function printDiff(diff: SecretsDiff): void {
  const { added, changed, unchanged } = diff
  const total = added.length + changed.length + unchanged.length

  if (total === 0) {
    output.dim('  No secrets to compare.')
    return
  }

  const width = 48
  const border = '─'.repeat(width)
  const lines: string[] = [`┌${border}┐`]

  for (const key of added) {
    lines.push(`│  ${GREEN_STD}+ ${key.padEnd(width - 2)}${RESET}  │`)
  }
  for (const key of changed) {
    lines.push(`│  ${YELLOW}~ ${key.padEnd(width - 2)}${RESET}  │`)
  }
  for (const key of unchanged) {
    lines.push(`│  ${GRAY}  ${key.padEnd(width - 2)}${RESET}  │`)
  }

  lines.push(`└${border}┘`)
  output.raw(lines.join('\n'))
  output.blank()

  const parts: string[] = []
  if (added.length) parts.push(`${GREEN_STD}+${added.length} added${RESET}`)
  if (changed.length) parts.push(`${YELLOW}~${changed.length} changed${RESET}`)
  if (unchanged.length)
    parts.push(`${GRAY}${unchanged.length} unchanged${RESET}`)
  output.raw(`  ${parts.join('  ')}`)
  output.blank()
}

export async function pushCommand(options: PushOptions): Promise<void> {
  printWelcomeBanner()

  await runPush(options, {
    selectFiles: async (files) => {
      const selected = await checkbox({
        message: 'Select files to push:',
        theme: inquirerTheme,
        choices: files.map((f) => ({ name: f, value: f })),
        validate: (v) => v.length > 0 || 'Select at least one file'
      })
      output.blank()
      return selected
    },
    resolveConflict: async (conflict) => {
      const { default: select } = await import('@inquirer/select')
      const chosen = await select({
        message: `Which value for ${GREEN}${conflict.key}${RESET}?`,
        theme: inquirerTheme,
        choices: conflict.files.map((file, i) => ({
          name: `${GRAY}${file}${RESET}  ${maskSecret(conflict.values[i] ?? '')}`,
          value: conflict.values[i]
        }))
      })
      return chosen ?? ''
    },
    confirm: (message) =>
      confirm({ message, default: true, theme: inquirerTheme }),
    onSpinner: (msg) => output.spinner(msg),
    onStopSpinner: () => output.stopSpinner(),
    onWarn: (msg) => {
      output.blank()
      output.warn(msg)
      output.blank()
    },
    onDiff: (diff, environment) => {
      output.blank()
      output.raw(`  ${GRAY}Changes to "${environment}":${RESET}`)
      output.blank()
      printDiff(diff)
    },
    onAbort: (reason) => output.info(reason),
    onUpToDate: () => {
      output.blank()
      output.success('Everything is up to date — nothing to push')
    },
    onSuccess: (summary) => {
      output.blank()
      output.raw(
        formatInfoBox([
          { label: 'Project', value: summary.projectSlug },
          { label: 'Environment', value: summary.environment },
          { label: 'Pushed', value: `${summary.upserted} secret(s)` },
          { label: 'Files', value: summary.files.join(', ') }
        ])
      )
      output.blank()
      output.success('Secrets pushed successfully')
      output.dim('Run "envy pull" to sync to another machine')
    }
  })
}

export function registerPush(program: Command): void {
  program
    .command('push')
    .description('Push local .env secrets to Envy')
    .option('--env <environment>', 'Target environment (overrides .envy.json)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options: PushOptions) => {
      await pushCommand(options)
    })
}
