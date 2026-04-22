import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import checkbox from '@inquirer/checkbox'
import confirm from '@inquirer/confirm'
import type { Command } from 'commander'
import { requireAuth } from '../lib/auth'
import { printWelcomeBanner } from '../lib/banner'
import { EnvyError, EXIT } from '../lib/errors'
import { output } from '../lib/output'
import { api } from '../lib/api'

const GREEN = '\x1b[38;2;61;214;140m'
const YELLOW = '\x1b[33m'
const GREEN_STD = '\x1b[32m'
const GRAY = '\x1b[38;5;240m'
const RESET = '\x1b[0m'

const theme = {
  prefix: { idle: `${GREEN}?${RESET}` },
  style: {
    answer: (t: string) => `${GREEN}${t}${RESET}`,
    highlight: (t: string) => `${GREEN}${t}${RESET}`,
    selectedChoice: (t: string) => `${GREEN}${t}${RESET}`
  }
}

function scanEnvFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => /^\.env(\..+)?$/.test(f))
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
      value = value.slice(1, -1)
    }
    if (key) result[key] = value
  }

  return result
}

async function hashSecrets(
  secrets: Record<string, string>
): Promise<{ key: string; hash: string }[]> {
  const { hashValue } = await import('@envy/crypto')
  return Promise.all(
    Object.entries(secrets).map(async ([key, value]) => ({
      key,
      hash: await hashValue(value)
    }))
  )
}

type ConflictResolution = {
  key: string
  files: string[]
  values: string[]
}

async function resolveConflicts(
  fileSecrets: { file: string; secrets: Record<string, string> }[]
): Promise<Record<string, string>> {
  const { default: select } = await import('@inquirer/select')
  const merged: Record<string, string> = {}
  const seen = new Map<string, { file: string; value: string }[]>()

  for (const { file, secrets } of fileSecrets) {
    for (const [key, value] of Object.entries(secrets)) {
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key)!.push({ file, value })
    }
  }

  const conflicts: ConflictResolution[] = []

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

  if (conflicts.length > 0) {
    output.blank()
    output.warn(`${conflicts.length} conflict(s) detected between selected files`)
    output.blank()

    for (const conflict of conflicts) {
      const chosen = await select({
        message: `Which value for ${GREEN}${conflict.key}${RESET}?`,
        theme,
        choices: conflict.files.map((file, i) => ({
          name: `${GRAY}${file}${RESET}  ${conflict.values[i]}`,
          value: conflict.values[i]
        }))
      })
      merged[conflict.key] = chosen ?? ''
    }
  }

  return merged
}

function printDiff(diff: {
  added: string[]
  changed: string[]
  unchanged: string[]
}): void {
  const { added, changed, unchanged } = diff
  const total = added.length + changed.length + unchanged.length

  if (total === 0) {
    output.dim('  No secrets to compare.')
    return
  }

  const width = 48
  const border = '─'.repeat(width)
  const lines: string[] = [`┌${border}┐`]

  for (const key of added) {
    lines.push(`│  ${GREEN_STD}+ ${key.padEnd(width - 2)}${RESET}  │`)
  }

  for (const key of changed) {
    lines.push(`│  ${YELLOW}~ ${key.padEnd(width - 2)}${RESET}  │`)
  }

  for (const key of unchanged) {
    lines.push(`│  ${GRAY}  ${key.padEnd(width - 2)}${RESET}  │`)
  }

  lines.push(`└${border}┘`)
  output.raw(lines.join('\n'))
  output.blank()

  const parts: string[] = []
  if (added.length) parts.push(`${GREEN_STD}+${added.length} added${RESET}`)
  if (changed.length) parts.push(`${YELLOW}~${changed.length} changed${RESET}`)
  if (unchanged.length) parts.push(`${GRAY}${unchanged.length} unchanged${RESET}`)

  output.raw(`  ${parts.join('  ')}`)
  output.blank()
}

export type PushOptions = {
  env?: string
}

export async function pushCommand(options: PushOptions): Promise<void> {
  requireAuth()

  const configPath = join(process.cwd(), '.envy.json')
  if (!existsSync(configPath)) {
    throw new EnvyError('No project linked', {
      suggestion: 'Run "envy init" to link this directory to a project',
      code: 'NO_CONFIG',
      exitCode: EXIT.USAGE
    })
  }

  let config: { project_id: string; project_slug: string; environment: string }
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'))
  } catch {
    throw new EnvyError(`Could not read ${configPath}`, {
      suggestion: 'Run "envy init" to reinitialise this directory',
      code: 'INVALID_CONFIG',
      exitCode: EXIT.USAGE
    })
  }

  const projectId: string = config.project_id
  const projectSlug: string = config.project_slug
  const environment: string = options.env ?? config.environment

  printWelcomeBanner()

  const envFiles = scanEnvFiles(process.cwd())

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
    output.dim(`Using ${envFiles[0]}`)
    output.blank()
  } else {
    selectedFiles = await checkbox({
      message: 'Select files to push:',
      theme,
      choices: envFiles.map((f) => ({ name: f, value: f })),
      validate: (v) => v.length > 0 || 'Select at least one file'
    })
    output.blank()
  }

  if (selectedFiles.length === 0) {
    output.info('Aborted.')
    return
  }

  const fileSecrets = selectedFiles.map((file) => ({
    file,
    secrets: parseEnvFile(join(process.cwd(), file))
  }))

  const secrets = await resolveConflicts(fileSecrets)
  const count = Object.keys(secrets).length

  if (count === 0) {
    throw new EnvyError('No secrets found in selected files', {
      suggestion: 'Check if your .env files have valid KEY=VALUE pairs',
      code: 'NO_SECRETS',
      exitCode: EXIT.USAGE
    })
  }

  output.spinner('Comparing with remote...')

  const hashes = await hashSecrets(secrets)
  const diff = await api.secrets.diff.query({
    projectId,
    environment,
    secrets: hashes
  })
  output.stopSpinner()

  const hasChanges = diff.added.length > 0 || diff.changed.length > 0
  if (!hasChanges) {
    output.blank()
    output.success('Everything is up to date — nothing to push')
    return
  }

  output.blank()
  output.raw(`  ${GRAY}Changes to "${environment}":${RESET}`)
  output.blank()
  printDiff(diff)

  const confirmed = await confirm({
    message: `Push changes to "${environment}"?`,
    default: true,
    theme
  })

  if (!confirmed) {
    output.info('Aborted.')
    return
  }

  const secretsToPush = Object.fromEntries(
    Object.entries(secrets).filter(
      ([key]) => diff.added.includes(key) || diff.changed.includes(key)
    )
  )

  output.spinner('Encrypting and pushing secrets...')
  const result = await api.secrets.push.mutate({
    projectId,
    environment,
    secrets: secretsToPush
  })
  output.stopSpinner()

  const lines = [
    { label: 'Project', value: projectSlug },
    { label: 'Environment', value: environment },
    { label: 'Pushed', value: `${result.upserted} secret(s)` },
    { label: 'Files', value: selectedFiles.join(', ') }
  ]

  const labelWidth = Math.max(...lines.map((l) => l.label.length))
  const valueWidth = Math.max(...lines.map((l) => l.value.length))
  const innerWidth = labelWidth + valueWidth + 6
  const border = '─'.repeat(innerWidth)

  const rows = lines.map(({ label, value }) => {
    const paddedLabel = `\x1b[38;5;240m${label.padEnd(labelWidth)}\x1b[0m`
    const paddedValue = `\x1b[38;2;61;214;140m${value.padEnd(valueWidth)}\x1b[0m`
    return `│  ${paddedLabel}  ${paddedValue}  │`
  })

  output.blank()
  output.raw([`┌${border}┐`, ...rows, `└${border}┘`].join('\n'))
  output.blank()
  output.success('Secrets pushed successfully')
  output.dim('Run "envy pull" to sync to another machine')
}

export function registerPush(program: Command): void {
  program
    .command('push')
    .description('Push local .env secrets to Envy')
    .option('--env <environment>', 'Target environment (overrides .envy.json)')
    .action(async (options: PushOptions) => {
      await pushCommand(options)
    })
}
