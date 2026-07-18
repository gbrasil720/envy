import confirm from '@inquirer/confirm'
import type { Command } from 'commander'
import { output } from '../core/output'
import { runUpdate } from '../core/services/update'
import { inquirerTheme } from '../core/theme'

export type UpdateOptions = {
  yes?: boolean
  force?: boolean
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  await runUpdate(
    { yes: options.yes, force: options.force ?? true },
    {
      onChecking: () => output.spinner('Checking for updates...'),
      onAlreadyLatest: (version) => {
        output.stopSpinner()
        output.blank()
        output.success(`Already up to date (v${version})`)
        output.blank()
      },
      onUpdateAvailable: (current, latest) => {
        output.stopSpinner()
        output.blank()
        output.info(`Update available: v${current} → v${latest}`)
      },
      confirmInstall: (current, latest) =>
        confirm({
          message: `Install v${latest} (currently v${current})?`,
          default: true,
          theme: inquirerTheme
        }),
      onInstalling: (method, command) => {
        output.blank()
        output.dim(`Using ${method}: ${command}`)
        output.spinner('Installing update...')
      },
      onSuccess: (result) => {
        output.stopSpinner()
        output.blank()
        output.success(`Updated v${result.from} → v${result.to}`)
        output.dim(
          'Restart any running envy TUI sessions to use the new version'
        )
        output.blank()
      },
      onUnknownInstall: (latest) => {
        output.stopSpinner()
        output.warn(
          `Could not detect install method. Install manually: npm install -g useenvy@${latest}`
        )
      }
    }
  )
}

export function registerUpdate(program: Command): void {
  const cmd = program
    .command('update')
    .alias('self-update')
    .description('Update the Envy CLI to the latest version')
    .option('-y, --yes', 'Install without confirmation')
    .option('--force', 'Bypass update-check cache')
    .action(async (options: UpdateOptions) => {
      await updateCommand({
        ...options,
        // Always re-check registry when user explicitly runs update
        force: options.force ?? true
      })
    })

  void cmd
}
