import { existsSync } from 'node:fs'
import { api } from '../api'
import { requireAuth } from '../auth'
import {
  assertNotSymlink,
  isValidEnvFilename,
  loadProjectConfig,
  parseEnvFile,
  scanEnvFiles,
  validateTargetPath,
  writeEnvFile
} from '../env-files'
import { EnvyError, EXIT } from '../errors'

export type PullOptions = {
  env?: string
  cwd?: string
  /** Target file override (headless). */
  output?: string
  /** Skip confirmation (CI / --yes). */
  yes?: boolean
}

export type PullSummary = {
  projectSlug: string
  environment: string
  secretsCount: number
  file: string
}

export type PullUI = {
  promptNewFilename: () => Promise<string>
  selectTarget: (files: string[]) => Promise<string> // file name or '__new__'
  confirmKeepLocal: (localOnly: string[]) => Promise<boolean>
  confirmOverwrite: (file: string) => Promise<boolean>
  onSpinner?: (message: string) => void
  onStopSpinner?: () => void
  onEmpty?: (environment: string) => void
  onAbort?: (reason: string) => void
  onSuccess?: (summary: PullSummary) => void
  onLocalOnly?: (file: string, keys: string[]) => void
}

export async function runPull(
  options: PullOptions,
  ui: PullUI
): Promise<PullSummary | null> {
  requireAuth()
  const cwd = options.cwd ?? process.cwd()
  const config = loadProjectConfig(cwd)
  const projectId = config.project_id
  const projectSlug = config.project_slug
  const environment = options.env ?? config.environment

  ui.onSpinner?.(`Fetching secrets from "${environment}"...`)
  const result = await api.secrets.reveal.query({ projectId, environment })
  ui.onStopSpinner?.()

  const remoteSecrets = result.secrets as Record<string, string>
  const remoteCount = Object.keys(remoteSecrets).length

  if (remoteCount === 0) {
    ui.onEmpty?.(environment)
    return null
  }

  let targetFile: string

  if (options.output) {
    if (!isValidEnvFilename(options.output)) {
      throw new EnvyError('Invalid file path', {
        suggestion: 'Use a valid .env filename in the current directory',
        code: 'INVALID_PATH',
        exitCode: EXIT.USAGE
      })
    }
    targetFile = options.output.trim()
  } else {
    const envFiles = scanEnvFiles(cwd)
    if (envFiles.length === 0) {
      targetFile = await ui.promptNewFilename()
    } else if (options.yes) {
      targetFile = envFiles.includes('.env.local')
        ? '.env.local'
        : (envFiles[0] as string)
    } else {
      const selected = await ui.selectTarget(envFiles)
      if (selected === '__new__') {
        targetFile = await ui.promptNewFilename()
      } else {
        targetFile = selected
      }
    }
  }

  if (!isValidEnvFilename(targetFile)) {
    throw new EnvyError('Invalid file path', {
      suggestion: 'Use a valid .env filename in the current directory',
      code: 'INVALID_PATH',
      exitCode: EXIT.USAGE
    })
  }

  const targetPath = validateTargetPath(cwd, targetFile)
  assertNotSymlink(targetPath, targetFile)

  let finalSecrets = { ...remoteSecrets }

  if (existsSync(targetPath)) {
    const localSecrets = parseEnvFile(targetPath)
    const localOnly = Object.keys(localSecrets).filter((k) => !remoteSecrets[k])

    if (localOnly.length > 0) {
      ui.onLocalOnly?.(targetFile, localOnly)
      const merge = options.yes ? true : await ui.confirmKeepLocal(localOnly)
      if (merge) {
        finalSecrets = { ...localSecrets, ...remoteSecrets }
      }
    } else if (!options.yes) {
      const overwrite = await ui.confirmOverwrite(targetFile)
      if (!overwrite) {
        ui.onAbort?.('Aborted.')
        return null
      }
    }
  }

  writeEnvFile(targetPath, finalSecrets)

  const summary: PullSummary = {
    projectSlug,
    environment,
    secretsCount: remoteCount,
    file: targetFile
  }
  ui.onSuccess?.(summary)
  return summary
}
