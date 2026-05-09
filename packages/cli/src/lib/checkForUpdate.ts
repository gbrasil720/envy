import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import pc from 'picocolors'
import { output } from './output'

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

function padLine(content: string, width: number): string {
  const visible = stripAnsi(content).length
  return content + ' '.repeat(width - visible)
}

const CACHE_DIR = join(homedir(), '.envy')
const CACHE_FILE = join(CACHE_DIR, 'update-check.json')
const ONE_DAY = 1000 * 60 * 60 * 24

interface UpdateCache {
  lastChecked: number
  latestVersion: string
}

function readCache(): UpdateCache | null {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8')
    return JSON.parse(raw) as UpdateCache
  } catch {
    return null
  }
}

function writeCache(data: UpdateCache): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(data))
  } catch {
    // silently ignore
  }
}

export async function checkForUpdate(currentVersion: string): Promise<void> {
  try {
    const cache = readCache()
    const now = Date.now()

    let latestVersion: string

    if (cache && now - cache.lastChecked < ONE_DAY) {
      latestVersion = cache.latestVersion
    } else {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)

      const res = await fetch('https://registry.npmjs.org/useenvy/latest', {
        signal: controller.signal
      })
      clearTimeout(timeout)

      const data = (await res.json()) as { version: string }
      latestVersion = data.version

      writeCache({ lastChecked: now, latestVersion })
    }

    if (latestVersion !== currentVersion) {
      const line1 = `Update available  ${pc.dim(currentVersion)} → ${pc.green(latestVersion)}`
      const line2 = `Run: ${pc.cyan('npm install -g useenvy')}`

      const width =
        Math.max(stripAnsi(line1).length, stripAnsi(line2).length) + 4
      const border = '─'.repeat(width)

      output.blank()
      output.raw(pc.yellow(`┌${border}┐`))
      output.raw(
        pc.yellow('│') + '  ' + padLine(line1, width - 2) + pc.yellow('│')
      )
      output.raw(
        pc.yellow('│') + '  ' + padLine(line2, width - 2) + pc.yellow('│')
      )
      output.raw(pc.yellow(`└${border}┘`))
      output.blank()
    }
  } catch {
    // silently ignore
  }
}
