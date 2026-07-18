import { GRAY, GREEN, RESET } from './theme'

export function formatInfoBox(
  lines: { label: string; value: string }[]
): string {
  const labelWidth = Math.max(...lines.map((l) => l.label.length))
  const valueWidth = Math.max(...lines.map((l) => l.value.length))
  const innerWidth = labelWidth + valueWidth + 6
  const border = '─'.repeat(innerWidth)

  const rows = lines.map(({ label, value }) => {
    const paddedLabel = `${GRAY}${label.padEnd(labelWidth)}${RESET}`
    const paddedValue = `${GREEN}${value.padEnd(valueWidth)}${RESET}`
    return `│  ${paddedLabel}  ${paddedValue}  │`
  })

  return [`┌${border}┐`, ...rows, `└${border}┘`].join('\n')
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function sanitizeForTerminal(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI + C0 controls
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x1f\x7f]/g, '')
}
