import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { EnvyError, EXIT } from './errors'

/** Match `.env`, `.env.local`, `.env.production`, etc. */
const ENV_FILE_RE = /^\.env(\..+)?$/

export function scanEnvFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => {
      if (!ENV_FILE_RE.test(f)) return false
      try {
        return lstatSync(join(dir, f)).isFile()
      } catch {
        return false
      }
    })
    .sort()
}

export function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8')
  const result: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }
    if (key) result[key] = value
  }

  return result
}

export function writeEnvFile(
  filePath: string,
  secrets: Record<string, string>
): void {
  const lines = Object.entries(secrets).map(([key, value]) => {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/"/g, '\\"')
    return `${key}="${escaped}"`
  })
  writeFileSync(filePath, `${lines.join('\n')}\n`, {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export function maskSecret(v: string): string {
  if (v.length === 0) return '(empty)'
  return v.slice(0, 3) + '•'.repeat(Math.max(0, Math.min(v.length - 3, 10)))
}

export function assertNotSymlink(filePath: string, label: string): void {
  try {
    if (existsSync(filePath) && lstatSync(filePath).isSymbolicLink()) {
      throw new EnvyError(
        `"${label}" is a symlink — refusing to read/write secrets on it`,
        {
          suggestion:
            'Use a regular file instead of a symlink, or choose a different path',
          code: 'SYMLINK_REFUSED',
          exitCode: EXIT.USAGE
        }
      )
    }
  } catch (err) {
    if (err instanceof EnvyError) throw err
  }
}

/** Ensure target stays inside cwd (no path traversal). */
export function validateTargetPath(cwd: string, targetFile: string): string {
  const targetPath = join(cwd, targetFile.trim())
  const resolvedPath = resolve(targetPath)
  const resolvedCwd = resolve(cwd)

  if (
    !resolvedPath.startsWith(resolvedCwd + sep) &&
    resolvedPath !== resolvedCwd
  ) {
    throw new EnvyError('Invalid file path', {
      suggestion: 'Use a valid .env filename in the current directory',
      code: 'INVALID_PATH',
      exitCode: EXIT.USAGE
    })
  }

  return targetPath
}

export function isValidEnvFilename(name: string): boolean {
  return /^\.env(\.[a-z0-9._-]+)?$/i.test(name.trim())
}

export type FileSecrets = {
  file: string
  secrets: Record<string, string>
}

export type KeyConflict = {
  key: string
  files: string[]
  values: string[]
}

/**
 * Merge secrets from multiple files. Keys with a single unique value are
 * auto-merged; multi-value keys become conflicts for the UI to resolve.
 */
export function collectMergesAndConflicts(fileSecrets: FileSecrets[]): {
  merged: Record<string, string>
  conflicts: KeyConflict[]
} {
  const merged: Record<string, string> = {}
  const seen = new Map<string, { file: string; value: string }[]>()

  for (const { file, secrets } of fileSecrets) {
    for (const [key, value] of Object.entries(secrets)) {
      const list = seen.get(key)
      if (list) {
        list.push({ file, value })
      } else {
        seen.set(key, [{ file, value }])
      }
    }
  }

  const conflicts: KeyConflict[] = []

  for (const [key, entries] of seen.entries()) {
    const uniqueValues = [...new Set(entries.map((e) => e.value))]
    if (uniqueValues.length === 1) {
      merged[key] = uniqueValues[0] ?? ''
    } else {
      conflicts.push({
        key,
        files: entries.map((e) => e.file),
        values: entries.map((e) => e.value)
      })
    }
  }

  return { merged, conflicts }
}

export function loadProjectConfig(cwd: string): {
  project_id: string
  project_slug: string
  environment: string
} {
  const configPath = join(cwd, '.envy.json')
  if (!existsSync(configPath)) {
    throw new EnvyError('No project linked', {
      suggestion: 'Run "envy init" to link this directory to a project',
      code: 'NO_CONFIG',
      exitCode: EXIT.USAGE
    })
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as {
      project_id: string
      project_slug: string
      environment: string
    }
  } catch {
    throw new EnvyError(`Could not read ${configPath}`, {
      suggestion: 'Run "envy init" to reinitialise this directory',
      code: 'INVALID_CONFIG',
      exitCode: EXIT.USAGE
    })
  }
}
