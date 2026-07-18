import type { Command } from 'commander'
import { formatInfoBox } from '../core/format'
import { output } from '../core/output'
import { runOpen } from '../core/services/open'

export type OpenOptions = Record<string, never>

export async function openCommand(): Promise<void> {
  const result = runOpen()

  if (!result.linked) {
    output.warn('No project linked in this directory')
    output.dim('Run "envy init" to link a project — opening dashboard instead')
  }

  const lines = [
    ...(result.projectLabel
      ? [{ label: 'Project', value: result.projectLabel }]
      : []),
    { label: 'URL', value: result.url }
  ]

  output.blank()
  output.raw(formatInfoBox(lines))
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
