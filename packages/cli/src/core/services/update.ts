import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import pkg from '../../../package.json'
import { EnvyError, EXIT } from '../errors'
import { isNewerVersion } from '../semver'

function cacheDir(): string {
  return process.env.ENVY_HOME ?? join(homedir(), '.envy')
}
function cacheFile(): string {
  return join(cacheDir(), 'update-check.json')
}
const ONE_DAY = 1000 * 60 * 60 * 24
const PACKAGE_NAME = 'useenvy'

export type InstallMethod = 'npm' | 'bun' | 'unknown'

export type UpdateCheck = {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
}

export type UpdateResult = {
  from: string
  to: string
  method: InstallMethod
}

export type UpdateUI = {
  onChecking?: () => void
  onAlreadyLatest?: (version: string) => void
  onUpdateAvailable?: (current: string, latest: string) => void
  confirmInstall?: (current: string, latest: string) => Promise<boolean>
  onInstalling?: (method: InstallMethod, command: string) => void
  onSuccess?: (result: UpdateResult) => void
  onUnknownInstall?: (latest: string) => void
}

type UpdateCache = {
  lastChecked: number
  latestVersion: string
}

function readCache(): UpdateCache | null {
  try {
    return JSON.parse(readFileSync(cacheFile(), 'utf-8')) as UpdateCache
  } catch {
    return null
  }
}

function writeCache(data: UpdateCache): void {
  try {
    mkdirSync(cacheDir(), { recursive: true })
    writeFileSync(cacheFile(), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export async function fetchLatestVersion(
  opts: { force?: boolean } = {}
): Promise<string> {
  const cache = readCache()
  const now = Date.now()

  if (!opts.force && cache && now - cache.lastChecked < ONE_DAY) {
    return cache.latestVersion
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      { signal: controller.signal }
    )
    if (!res.ok) {
      throw new EnvyError('Could not reach npm registry', {
        suggestion: 'Check your network connection and try again',
        code: 'UPDATE_CHECK_FAILED',
        exitCode: EXIT.NETWORK
      })
    }
    const data = (await res.json()) as { version: string }
    writeCache({ lastChecked: now, latestVersion: data.version })
    return data.version
  } catch (err) {
    if (err instanceof EnvyError) throw err
    throw new EnvyError('Could not check for updates', {
      suggestion: 'Check your network connection and try again',
      code: 'UPDATE_CHECK_FAILED',
      exitCode: EXIT.NETWORK,
      cause: err
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkUpdate(
  opts: { force?: boolean } = {}
): Promise<UpdateCheck> {
  const currentVersion = pkg.version
  const latestVersion = await fetchLatestVersion(opts)
  return {
    currentVersion,
    latestVersion,
    updateAvailable: isNewerVersion(latestVersion, currentVersion)
  }
}

/**
 * Detect whether the global install is managed by npm or bun.
 * npm: package lives under `npm root -g`
 * bun: binary path or global bin under bun's install prefix
 */
export async function detectInstallMethod(): Promise<InstallMethod> {
  const npmRoot = await runCapture('npm', ['root', '-g'])
  if (npmRoot) {
    const pkgPath = join(npmRoot.trim(), PACKAGE_NAME)
    if (existsSync(pkgPath)) return 'npm'
  }

  const bunBin = process.execPath
  if (bunBin.includes('bun') || process.env.BUN_INSTALL) {
    const bunPm = await runCapture('bun', ['pm', 'ls', '-g'])
    if (bunPm?.includes(PACKAGE_NAME)) return 'bun'
  }

  // Heuristic: if argv0 is under bun install path
  const exec = process.argv[1] ?? ''
  if (exec.includes('.bun') || exec.includes('bun')) return 'bun'
  if (exec.includes('node_modules') && exec.includes(PACKAGE_NAME)) {
    // installed via npm-like global
    if (npmRoot && exec.includes(npmRoot.trim())) return 'npm'
  }

  // Last resort: prefer npm if npm root worked
  if (npmRoot) return 'npm'

  return 'unknown'
}

function installCommand(method: InstallMethod): string[] | null {
  if (method === 'npm')
    return ['npm', 'install', '-g', `${PACKAGE_NAME}@latest`]
  if (method === 'bun') return ['bun', 'add', '-g', `${PACKAGE_NAME}@latest`]
  return null
}

export async function runUpdate(
  options: { yes?: boolean; force?: boolean } = {},
  ui: UpdateUI = {}
): Promise<UpdateResult | null> {
  ui.onChecking?.()
  const check = await checkUpdate({ force: options.force ?? true })

  if (!check.updateAvailable) {
    ui.onAlreadyLatest?.(check.currentVersion)
    return null
  }

  ui.onUpdateAvailable?.(check.currentVersion, check.latestVersion)

  if (!options.yes) {
    const ok = ui.confirmInstall
      ? await ui.confirmInstall(check.currentVersion, check.latestVersion)
      : true
    if (!ok) return null
  }

  const method = await detectInstallMethod()
  const cmd = installCommand(method)

  if (!cmd) {
    ui.onUnknownInstall?.(check.latestVersion)
    throw new EnvyError('Could not detect how Envy was installed', {
      suggestion: `Run: npm install -g ${PACKAGE_NAME}@latest  (or bun add -g ${PACKAGE_NAME}@latest)`,
      code: 'UNKNOWN_INSTALL',
      exitCode: EXIT.USAGE
    })
  }

  const [bin, ...args] = cmd
  if (!bin) {
    throw new EnvyError('Could not detect how Envy was installed', {
      suggestion: `Run: npm install -g ${PACKAGE_NAME}@latest  (or bun add -g ${PACKAGE_NAME}@latest)`,
      code: 'UNKNOWN_INSTALL',
      exitCode: EXIT.USAGE
    })
  }
  ui.onInstalling?.(method, cmd.join(' '))

  const code = await spawnInherit(bin, args)
  if (code !== 0) {
    throw new EnvyError(`Update failed (exit ${code})`, {
      suggestion: `Try running manually: ${cmd.join(' ')}`,
      code: 'UPDATE_FAILED',
      exitCode: EXIT.SOFTWARE
    })
  }

  const result: UpdateResult = {
    from: check.currentVersion,
    to: check.latestVersion,
    method
  }
  ui.onSuccess?.(result)
  return result
}

function runCapture(bin: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout?.on('data', (d: Buffer) => {
      out += d.toString()
    })
    child.on('error', () => resolve(null))
    child.on('close', (code) => {
      resolve(code === 0 ? out : null)
    })
  })
}

function spawnInherit(bin: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: 'inherit', shell: false })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}
