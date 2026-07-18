import { join } from 'node:path'
import { api } from '../api'
import { requireAuth } from '../auth'
import {
  assertNotSymlink,
  collectMergesAndConflicts,
  type KeyConflict,
  loadProjectConfig,
  parseEnvFile,
  scanEnvFiles
} from '../env-files'
import { EnvyError, EXIT } from '../errors'

export type PushOptions = {
  env?: string
  cwd?: string
  /** Skip confirmation (CI / --yes). */
  yes?: boolean
}

export type SecretsDiff = {
  added: string[]
  changed: string[]
  unchanged: string[]
}

export type PushSummary = {
  projectSlug: string
  environment: string
  upserted: number
  files: string[]
}

export type PushUI = {
  selectFiles: (files: string[]) => Promise<string[]>
  resolveConflict: (conflict: KeyConflict) => Promise<string>
  confirm: (message: string) => Promise<boolean>
  onSpinner?: (message: string) => void
  onStopSpinner?: () => void
  onDiff?: (diff: SecretsDiff, environment: string) => void
  onAbort?: (reason: string) => void
  onUpToDate?: () => void
  onSuccess?: (summary: PushSummary) => void
  onWarn?: (message: string) => void
}

export async function runPush(
  options: PushOptions,
  ui: PushUI
): Promise<PushSummary | null> {
  requireAuth()
  const cwd = options.cwd ?? process.cwd()
  const config = loadProjectConfig(cwd)
  const projectId = config.project_id
  const projectSlug = config.project_slug
  const environment = options.env ?? config.environment

  const envFiles = scanEnvFiles(cwd)
  if (envFiles.length === 0) {
    throw new EnvyError('No .env files found in current directory', {
      suggestion: 'Create a .env file first',
      code: 'NO_ENV_FILES',
      exitCode: EXIT.USAGE
    })
  }

  let selectedFiles: string[]
  if (envFiles.length === 1) {
    selectedFiles = envFiles
  } else if (options.yes) {
    selectedFiles = envFiles
  } else {
    selectedFiles = await ui.selectFiles(envFiles)
  }

  if (selectedFiles.length === 0) {
    ui.onAbort?.('Aborted.')
    return null
  }

  const fileSecrets = selectedFiles.map((file) => {
    const filePath = join(cwd, file)
    assertNotSymlink(filePath, file)
    return { file, secrets: parseEnvFile(filePath) }
  })

  const { merged, conflicts } = collectMergesAndConflicts(fileSecrets)

  if (conflicts.length > 0) {
    ui.onWarn?.(
      `${conflicts.length} conflict(s) detected between selected files`
    )
    for (const conflict of conflicts) {
      merged[conflict.key] = await ui.resolveConflict(conflict)
    }
  }

  const count = Object.keys(merged).length
  if (count === 0) {
    throw new EnvyError('No secrets found in selected files', {
      suggestion: 'Check if your .env files have valid KEY=VALUE pairs',
      code: 'NO_SECRETS',
      exitCode: EXIT.USAGE
    })
  }

  ui.onSpinner?.('Comparing with remote...')
  const diff = (await api.secrets.diff.mutate({
    projectId,
    environment,
    secrets: merged
  })) as SecretsDiff
  ui.onStopSpinner?.()

  const hasChanges = diff.added.length > 0 || diff.changed.length > 0
  if (!hasChanges) {
    ui.onUpToDate?.()
    return null
  }

  ui.onDiff?.(diff, environment)

  if (!options.yes) {
    const confirmed = await ui.confirm(`Push changes to "${environment}"?`)
    if (!confirmed) {
      ui.onAbort?.('Aborted.')
      return null
    }
  }

  const secretsToPush = Object.fromEntries(
    Object.entries(merged).filter(
      ([key]) => diff.added.includes(key) || diff.changed.includes(key)
    )
  )

  ui.onSpinner?.('Encrypting and pushing secrets...')
  const result = await api.secrets.push.mutate({
    projectId,
    environment,
    secrets: secretsToPush
  })
  ui.onStopSpinner?.()

  if (!result || typeof result.upserted !== 'number') {
    throw new EnvyError('Push failed — unexpected response from server', {
      suggestion: 'Try again, or check the server logs',
      code: 'PUSH_FAILED',
      exitCode: EXIT.SOFTWARE
    })
  }

  const summary: PushSummary = {
    projectSlug,
    environment,
    upserted: result.upserted,
    files: selectedFiles
  }
  ui.onSuccess?.(summary)
  return summary
}
