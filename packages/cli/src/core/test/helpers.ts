import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveAuth } from '../auth'
import { CONFIG_FILENAME } from '../constants'

export type TempWorkspace = {
  root: string
  envyHome: string
  cwd: string
  cleanup: () => void
}

/**
 * Isolated ENVY_HOME + project cwd for service tests.
 * Restores previous env on cleanup.
 */
export function createTempWorkspace(prefix = 'envy-cli-'): TempWorkspace {
  const root = mkdtempSync(join(tmpdir(), prefix))
  const envyHome = join(root, 'home')
  const cwd = join(root, 'project')
  mkdirSync(envyHome, { recursive: true })
  mkdirSync(cwd, { recursive: true })

  const prevHome = process.env.ENVY_HOME
  process.env.ENVY_HOME = envyHome

  return {
    root,
    envyHome,
    cwd,
    cleanup: () => {
      if (prevHome === undefined) delete process.env.ENVY_HOME
      else process.env.ENVY_HOME = prevHome
      rmSync(root, { recursive: true, force: true })
    }
  }
}

export async function seedAuth(
  overrides: Partial<{ token: string; user: string; api_url: string }> = {}
) {
  await saveAuth({
    token: overrides.token ?? 'envy_live_test_token',
    user: overrides.user ?? 'tester',
    api_url: overrides.api_url ?? 'http://localhost:3000'
  })
}

export function writeProjectConfig(
  cwd: string,
  config: {
    project_id?: string
    project_slug?: string
    environment?: string
  } = {}
) {
  writeFileSync(
    join(cwd, CONFIG_FILENAME),
    JSON.stringify(
      {
        project_id: config.project_id ?? 'proj-1',
        project_slug: config.project_slug ?? 'demo',
        environment: config.environment ?? 'development'
      },
      null,
      2
    )
  )
}

export function writeEnv(
  cwd: string,
  filename: string,
  content: string | Record<string, string>
) {
  const body =
    typeof content === 'string'
      ? content
      : `${Object.entries(content)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')}\n`
  writeFileSync(join(cwd, filename), body)
}
