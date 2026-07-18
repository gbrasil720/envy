import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import { inkColor, useTheme } from '../theme'

export function Panel({
  title,
  width = 36,
  children
}: {
  title: string
  width?: number
  children: ReactNode
}) {
  const theme = useTheme()
  const inner = width - 2
  const tail = Math.max(0, inner - title.length - 3)

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
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={inkColor(theme.border) ?? 'gray'}
        borderTop={false}
        paddingX={1}
        width={width}
      >
        {children}
      </Box>
    </Box>
  )
}
