import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import { inkColor, useTheme } from '../theme'

export type ShortcutItem = [key: string, label: string]

export function Shortcuts({
  items,
  leading
}: {
  items: ShortcutItem[]
  leading?: ReactNode
}) {
  const theme = useTheme()

  return (
    <Box flexDirection="row" flexShrink={0}>
      {leading ? (
        <>
          {leading}
          <Text> </Text>
        </>
      ) : null}
      {items.map(([key, label], i) => (
        <Text key={`${key}-${label}`}>
          {i > 0 ? (
            <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
              {'  ·  '}
            </Text>
          ) : null}
          <Text color={inkColor(theme.brand)} bold>
            {key}
          </Text>
          <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
            {' '}
            {label}
          </Text>
        </Text>
      ))}
    </Box>
  )
}
