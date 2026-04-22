import type { Command } from 'commander'
import pkg from '../../package.json'
import { requireAuth } from '../lib/auth'
import { printWelcomeBanner } from '../lib/banner'
import { output } from '../lib/output'
import { api } from '../lib/api'

export type WhoamiOptions = Record<string, never>

export async function whoamiCommand(): Promise<void> {
  requireAuth()

  const user = await api.me.get.query()

  printWelcomeBanner()

  const lines = [
    { label: 'User', value: user.name ?? '—' },
    { label: 'Email', value: user.email },
    { label: 'Version', value: `v${pkg.version}` }
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

  output.raw([`┌${border}┐`, ...rows, `└${border}┘`].join('\n'))
  output.blank()
}

export function registerWhoAmI(program: Command): void {
  program
    .command('whoami')
    .description('Show the current authenticated user')
    .action(async () => {
      await whoamiCommand()
    })
}
