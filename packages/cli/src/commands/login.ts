import type { Command } from 'commander'
import { printWelcomeBanner } from '../core/banner'
import { output } from '../core/output'
import { runLogin } from '../core/services/login'

export type LoginOptions = Record<string, never>

export async function loginCommand(): Promise<void> {
  printWelcomeBanner()

  const result = await runLogin({
    onStart: (url) => {
      output.info('Opening browser for authentication...')
      output.dim(`If it didn't open, visit: ${url}`)
    },
    onBrowserWarn: (msg) => output.warn(msg),
    onWaiting: () => {
      output.spinner('Waiting for authorization...')
    },
    onDone: () => {
      output.stopSpinner()
    }
  })

  printWelcomeBanner({ name: result.name, email: result.email })
  output.success(`Authenticated as ${result.name} (${result.email})`)
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Authenticate the CLI with your Envy account')
    .action(async () => {
      await loginCommand()
    })
}
