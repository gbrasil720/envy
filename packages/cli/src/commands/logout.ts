import type { Command } from 'commander'
import { api } from '../lib/api'
import { clearAuth, requireAuth } from '../lib/auth'
import { output } from '../lib/output'

export type LogoutOptions = Record<string, never>

export async function logoutCommand(): Promise<void> {
  requireAuth()

  output.spinner('Revoking token...')
  await api.auth.logout.mutate()
  clearAuth()
  output.stopSpinner()

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
    .action(async () => {
      await logoutCommand()
    })
}
