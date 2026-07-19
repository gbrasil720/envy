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

export type Credentials = {
  token: string
  user: string
  api_url: string
  created_at: string
}

/** Override with ENVY_HOME in tests or custom installs. */
export function getEnvyHome(): string {
  return process.env.ENVY_HOME ?? join(homedir(), '.envy')
}

export function getCredentialsPath(): string {
  return join(getEnvyHome(), 'credentials.json')
}

export function getAuth(): Credentials | null {
  const path = getCredentialsPath()
  if (!existsSync(path)) return null

  try {
    const raw = readFileSync(path, 'utf-8')
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
  const path = getCredentialsPath()
  const dir = dirname(path)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const payload: Credentials = {
    ...credentials,
    created_at: new Date().toISOString()
  }

  writeFileSync(path, JSON.stringify(payload, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export function clearAuth(): void {
  const path = getCredentialsPath()
  if (existsSync(path)) {
    rmSync(path)
  }
}
