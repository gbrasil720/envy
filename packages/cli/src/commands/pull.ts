import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import select from '@inquirer/select'
import type { Command } from 'commander'
import { api } from '../lib/api'
import { requireAuth } from '../lib/auth'
import { printWelcomeBanner } from '../lib/banner'
import { EnvyError, EXIT } from '../lib/errors'
import { output } from '../lib/output'
import { parseEnvFile } from './push'

const GREEN = '\x1b[38;2;61;214;140m'
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

function writeEnvFile(filePath: string, secrets: Record<string, string>): void {
  const lines = Object.entries(secrets).map(([key, value]) => {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/"/g, '\\"')
    return `${key}="${escaped}"`
  })
  writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8')
}

function validateTargetPath(targetFile: string): string {
  const targetPath = join(process.cwd(), targetFile.trim())
  const resolvedPath = resolve(targetPath)
  const resolvedCwd = resolve(process.cwd())

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

export type PullOptions = {
  env?: string
}

export async function pullCommand(options: PullOptions): Promise<void> {
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

  output.spinner(`Fetching secrets from "${environment}"...`)
  const result = await api.secrets.reveal.query({ projectId, environment })
  output.stopSpinner()

  const remoteSecrets = result.secrets
  const remoteCount = Object.keys(remoteSecrets).length

  if (remoteCount === 0) {
    output.blank()
    output.info(`No secrets found in "${environment}"`)
    output.dim('Run "envy push" to upload your secrets first')
    return
  }

  output.blank()

  const envFiles = scanEnvFiles(process.cwd())

  let targetFile: string

  if (envFiles.length === 0) {
    targetFile = await input({
      message: 'No .env files found. Enter filename to create:',
      default: '.env.local',
      theme,
      validate: (v) =>
        /^\.env(\..+)?$/.test(v.trim()) || 'Must be a valid .env filename'
    })
  } else {
    const choices = [
      ...envFiles.map((f) => ({ name: f, value: f })),
      { name: `${GRAY}+ Create new file${RESET}`, value: '__new__' }
    ]

    const selected = await select({
      message: 'Write secrets to:',
      theme,
      choices
    })

    if (selected === '__new__') {
      targetFile = await input({
        message: 'Filename:',
        default: '.env.local',
        theme,
        validate: (v) =>
          /^\.env(\..+)?$/.test(v.trim()) || 'Must be a valid .env filename'
      })
    } else {
      targetFile = selected
    }
  }

  const targetPath = validateTargetPath(targetFile)
  let finalSecrets = { ...remoteSecrets }

  if (existsSync(targetPath)) {
    const localSecrets = parseEnvFile(targetPath)
    const localOnly = Object.keys(localSecrets).filter((k) => !remoteSecrets[k])

    if (localOnly.length > 0) {
      output.blank()
      output.raw(
        `  ${GRAY}"${targetFile}" has ${localOnly.length} local key(s) not in remote:${RESET}`
      )
      for (const key of localOnly) {
        output.raw(`${GRAY}    · ${key}${RESET}`)
      }
      output.blank()

      const merge = await confirm({
        message: 'Keep local-only keys? (No = overwrite completely)',
        default: true,
        theme
      })

      if (merge) {
        finalSecrets = { ...localSecrets, ...remoteSecrets }
      }
    } else {
      const overwrite = await confirm({
        message: `Overwrite "${targetFile}"?`,
        default: true,
        theme
      })

      if (!overwrite) {
        output.info('Aborted.')
        return
      }
    }
  }

  writeEnvFile(targetPath, finalSecrets)

  const lines = [
    { label: 'Project', value: projectSlug },
    { label: 'Environment', value: environment },
    { label: 'Secrets', value: `${remoteCount} pulled` },
    { label: 'File', value: targetFile }
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
  output.success('Secrets pulled successfully')
  output.dim('Run "envy push" to sync changes back')
}

export function registerPull(program: Command): void {
  program
    .command('pull')
    .description('Pull secrets from Envy to a local .env file')
    .option('--env <environment>', 'Source environment (overrides .envy.json)')
    .action(async (options: PullOptions) => {
      await pullCommand(options)
    })
}
