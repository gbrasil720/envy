import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { EnvyError, EXIT } from './errors'

const CREDENTIALS_PATH = join(homedir(), '.envy', 'credentials.json')

export type Credentials = {
  token: string
  user: string
  api_url: string
  created_at: string
}

export function getAuth(): Credentials | null {
  if (!existsSync(CREDENTIALS_PATH)) return null

  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf-8')
    return JSON.parse(raw) as Credentials
  } catch {
    return null
  }
}

export function requireAuth(): Credentials {
  const auth = getAuth()

  if (!auth) {
    throw new EnvyError('Not authenticated', {
      suggestion: 'Run "envy login" to authenticate',
      code: 'AUTH_REQUIRED',
      exitCode: EXIT.AUTH
    })
  }

  return auth
}

export async function saveAuth(
  credentials: Omit<Credentials, 'created_at'>
): Promise<void> {
  const dir = dirname(CREDENTIALS_PATH)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const payload: Credentials = {
    ...credentials,
    created_at: new Date().toISOString()
  }

  // Pass mode directly to writeFileSync for cross-platform compatibility
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(payload, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export function clearAuth(): void {
  if (existsSync(CREDENTIALS_PATH)) {
    rmSync(CREDENTIALS_PATH)
  }
}
