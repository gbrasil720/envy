import { Box, Text } from 'ink'
import type { SecretsDiff } from '../../core/services/push'
import { inkColor, useTheme } from '../theme'
import { Gap } from './Gap'

export function DiffTheater({
  diff,
  environment,
  width = 42
}: {
  diff: SecretsDiff
  environment: string
  width?: number
}) {
  const theme = useTheme()
  const inner = width - 2
  const title = `diff · ${environment}`
  const tail = Math.max(0, inner - title.length - 3)

  const rows: { kind: '+' | '~' | ' '; key: string }[] = [
    ...diff.added.map((k) => ({ kind: '+' as const, key: k })),
    ...diff.changed.map((k) => ({ kind: '~' as const, key: k })),
    ...diff.unchanged.map((k) => ({ kind: ' ' as const, key: k }))
  ]

  const maxShow = 12
  const shown = rows.slice(0, maxShow)
  const extra = rows.length - shown.length

  return (
    <Box flexDirection="column" width={width} flexShrink={0}>
      <Text>
        <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
          {'╭─ '}
        </Text>
        <Text color={inkColor(theme.brand)}>{title}</Text>
        <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
          {` ${'─'.repeat(tail)}╮`}
        </Text>
      </Text>
      {shown.map((r) => {
        const color =
          r.kind === '+'
            ? theme.brand
            : r.kind === '~'
              ? theme.warn
              : theme.muted
        const prefix = r.kind === ' ' ? '  ' : `${r.kind} `
        const line = `${prefix}${r.key}`.slice(0, inner - 2).padEnd(inner - 2)
        return (
          <Text key={`${r.kind}${r.key}`}>
            <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
              │
            </Text>
            <Text color={inkColor(color)} dimColor={r.kind === ' '}>
              {` ${line} `}
            </Text>
            <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
              │
            </Text>
          </Text>
        )
      })}
      {extra > 0 ? (
        <Text>
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            │
          </Text>
          <Text color={inkColor(theme.muted)} dimColor>
            {` … +${extra} more`.padEnd(inner)}
          </Text>
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            │
          </Text>
        </Text>
      ) : null}
      <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
        {`╰${'─'.repeat(inner)}╯`}
      </Text>
      <Gap />
      <Text>
        <Text color={inkColor(theme.brand)} bold>
          +{diff.added.length}
        </Text>
        <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
          {' added  '}
        </Text>
        <Text color={inkColor(theme.warn)} bold>
          ~{diff.changed.length}
        </Text>
        <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
          {' changed  '}
        </Text>
        <Text color={inkColor(theme.muted)} dimColor>
          {diff.unchanged.length} unchanged
        </Text>
      </Text>
    </Box>
  )
}
