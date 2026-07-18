import type { Command } from 'commander'
import { printWelcomeBanner } from '../core/banner'
import { formatInfoBox } from '../core/format'
import { output } from '../core/output'
import { runWhoami } from '../core/services/whoami'

export type WhoamiOptions = Record<string, never>

export async function whoamiCommand(): Promise<void> {
  const user = await runWhoami()

  printWelcomeBanner()
  output.raw(
    formatInfoBox([
      { label: 'User', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Version', value: user.version }
    ])
  )
  output.blank()
}

export function registerWhoAmI(program: Command): void {
  program
    .command('whoami')
    .description('Show the current authenticated user')
    .action(async () => {
      await whoamiCommand()
    })
}
