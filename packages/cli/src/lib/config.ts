import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { CONFIG_FILENAME } from './constants'
import { EnvyError, EXIT } from './errors'

const MAX_WALK_DEPTH = 5

const EnvyConfigSchema = z.object({
  project_id: z.string().min(1),
  project_slug: z.string().regex(/^[a-z0-9-]+$/),
  environment: z.string().min(1).max(64)
})

export type EnvyConfig = z.infer<typeof EnvyConfigSchema>

export function getConfig(): EnvyConfig | null {
  const path = findConfigFile()
  if (!path) return null

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = EnvyConfigSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    return parsed.data
  } catch {
    return null
  }
}

export function requireConfig(): EnvyConfig {
  const config = getConfig()

  if (!config) {
    throw new EnvyError('Project not linked', {
      suggestion: "Run 'envy init' to link this directory to a project",
      code: 'CONFIG_REQUIRED',
      exitCode: EXIT.USAGE
    })
  }

  return config
}

export function saveConfig(
  config: EnvyConfig,
  dir: string = process.cwd()
): void {
  const path = join(dir, CONFIG_FILENAME)
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8')
  appendToGitignore(dir)
}

function findConfigFile(): string | null {
  let current = process.cwd()

  for (let i = 0; i < MAX_WALK_DEPTH; i++) {
    const candidate = join(current, CONFIG_FILENAME)

    if (existsSync(candidate)) return candidate

    const parent = join(current, '..')
    if (parent === current) break
    current = parent
  }

  return null
}

function appendToGitignore(dir: string): void {
  const gitignorePath = join(dir, '.gitignore')
  const entry = '\n# Envy project config\n.envy.json\n'

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8')
    if (!content.includes(CONFIG_FILENAME)) {
      appendFileSync(gitignorePath, entry)
    }
  } else {
    writeFileSync(gitignorePath, entry.trimStart())
  }
}
