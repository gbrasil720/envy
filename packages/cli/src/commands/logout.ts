import type { Command } from 'commander'
import { output } from '../core/output'
import { runLogout } from '../core/services/logout'

export type LogoutOptions = {
  yes?: boolean
}

export async function logoutCommand(
  _options: LogoutOptions = {}
): Promise<void> {
  await runLogout({
    onStart: () => output.spinner('Revoking token...'),
    onDone: () => output.stopSpinner()
  })

  output.blank()
  output.success('Logged out successfully')
  output.dim('Credentials removed from ~/.envy/credentials.json')
  output.dim('Run "envy login" to authenticate again')
  output.blank()
}

export function registerLogout(program: Command): void {
  program
    .command('logout')
    .description('Revoke your CLI token and remove local credentials')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (options: LogoutOptions) => {
      await logoutCommand(options)
    })
}
