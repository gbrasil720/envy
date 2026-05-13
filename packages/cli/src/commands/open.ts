import { spawn } from 'node:child_process'
import type { Command } from 'commander'
import { requireAuth } from '../lib/auth'
import { getConfig } from '../lib/config'
import { WEB_URL } from '../lib/constants'
import { output } from '../lib/output'

const GREEN = '\x1b[38;2;61;214;140m'
const GRAY = '\x1b[38;5;240m'
const RESET = '\x1b[0m'

export type OpenOptions = Record<string, never>

export async function openCommand(): Promise<void> {
  requireAuth()

  let url: string
  let projectLabel: string | null = null

  const config = getConfig()
  if (config?.project_slug) {
    // project_slug is already validated against /^[a-z0-9-]+$/ by getConfig()
    url = `${WEB_URL}/dashboard/${encodeURIComponent(config.project_slug)}`
    projectLabel = config.project_slug
  } else {
    url = `${WEB_URL}/dashboard`
    output.warn('No project linked in this directory')
    output.dim('Run "envy init" to link a project — opening dashboard instead')
  }

  try {
    if (process.platform === 'win32') {
      // Pass an empty title string so cmd /c start treats the next arg as a URL,
      // preventing shell metacharacter interpretation.
      spawn('cmd', ['/c', 'start', '""', url], {
        detached: true,
        stdio: 'ignore'
      })
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' })
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
    }
  } catch {
    output.warn('Could not open browser automatically — visit the URL above')
  }

  const lines = [
    ...(projectLabel ? [{ label: 'Project', value: projectLabel }] : []),
    { label: 'URL', value: url }
  ]

  const labelWidth = Math.max(...lines.map((l) => l.label.length))
  const valueWidth = Math.max(...lines.map((l) => l.value.length))
  const innerWidth = labelWidth + valueWidth + 6
  const border = '─'.repeat(innerWidth)

  const rows = lines.map(({ label, value }) => {
    const paddedLabel = `${GRAY}${label.padEnd(labelWidth)}${RESET}`
    const paddedValue = `${GREEN}${value.padEnd(valueWidth)}${RESET}`
    return `│  ${paddedLabel}  ${paddedValue}  │`
  })

  output.blank()
  output.raw([`┌${border}┐`, ...rows, `└${border}┘`].join('\n'))
  output.blank()
  output.success('Opened in browser')
  output.blank()
}

export function registerOpen(program: Command): void {
  program
    .command('open')
    .description('Open the Envy dashboard in your browser')
    .action(async () => {
      await openCommand()
    })
}
