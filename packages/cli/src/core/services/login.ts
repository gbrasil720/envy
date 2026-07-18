import { spawn } from 'node:child_process'
import { api } from '../api'
import { saveAuth } from '../auth'
import { API_URL, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants'
import { EnvyError, EXIT } from '../errors'

export type LoginResult = {
  name: string
  email: string
}

export type LoginUI = {
  onStart?: (url: string) => void
  onBrowserWarn?: (message: string) => void
  onWaiting?: () => void
  onDone?: () => void
}

async function pollForApiKey(sessionToken: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

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

function openBrowser(url: string): { opened: boolean; warn?: string } {
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return {
        opened: false,
        warn: 'Unexpected URL scheme — skipping auto-open'
      }
    }
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], {
        detached: true,
        stdio: 'ignore'
      })
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' })
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
    }
    return { opened: true }
  } catch {
    return {
      opened: false,
      warn: 'Could not open browser automatically — visit the URL above'
    }
  }
}

export async function runLogin(ui: LoginUI = {}): Promise<LoginResult> {
  const { session_token, url } = await api.cliAuth.start.mutate()

  ui.onStart?.(url)
  const browser = openBrowser(url)
  if (browser.warn) ui.onBrowserWarn?.(browser.warn)

  ui.onWaiting?.()
  const apiKey = await pollForApiKey(session_token)
  ui.onDone?.()

  await saveAuth({ token: apiKey, user: '', api_url: API_URL })
  const me = await api.me.get.query()
  await saveAuth({ token: apiKey, user: me.name, api_url: API_URL })

  return {
    name: me.name ?? 'Unknown',
    email: me.email
  }
}

export { openBrowser }
