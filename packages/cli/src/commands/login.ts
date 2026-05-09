import type { Command } from 'commander'
import { api } from '../lib/api'
import { saveAuth } from '../lib/auth'
import { printWelcomeBanner } from '../lib/banner'
import { API_URL, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../lib/constants'
import { EnvyError, EXIT } from '../lib/errors'
import { output } from '../lib/output'
import { spawn } from 'node:child_process'

async function pollForApiKey(sessionToken: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    const result = await api.cliAuth.poll.query({ token: sessionToken })

    if (result.status === 'authorized') {
      return result.api_key ?? ''
    }

    if (result.status === 'cancelled') {
      throw new EnvyError('Login cancelled', {
        suggestion: "Run 'envy login' to try again",
        code: 'AUTH_CANCELLED',
        exitCode: EXIT.AUTH
      })
    }
  }

  throw new EnvyError('Login expired', {
    suggestion: "Run 'envy login' to try again",
    code: 'AUTH_TIMEOUT',
    exitCode: EXIT.AUTH
  })
}

export type LoginOptions = Record<string, never>

export async function loginCommand(): Promise<void> {
  printWelcomeBanner()

  const { session_token, url } = await api.cliAuth.start.mutate()

  output.info('Opening browser for authentication...')
  output.dim(`If it didn't open, visit: ${url}`)

  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' })
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' })
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
    }
  } catch {
    output.warn('Could not open browser automatically — visit the URL above')
  }

  output.spinner('Waiting for authorization...')

  const apiKey = await pollForApiKey(session_token)

  output.stopSpinner()

  await saveAuth({ token: apiKey, user: '', api_url: API_URL })

  const me = await api.me.get.query()

  await saveAuth({ token: apiKey, user: me.name, api_url: API_URL })

  printWelcomeBanner({ name: me.name ?? 'Unknown', email: me.email })
  output.success(`Authenticated as ${me.name} (${me.email})`)
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Authenticate the CLI with your Envy account')
    .action(async () => {
      await loginCommand()
    })
}
