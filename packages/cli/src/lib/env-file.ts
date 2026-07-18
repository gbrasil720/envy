import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'

export function scanEnvFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => {
      if (!/^\.env(\..+)?$/.test(f)) return false
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

export function listEnvFilenames(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => /^\.env(\..+)?$/.test(f))
    .sort()
}
