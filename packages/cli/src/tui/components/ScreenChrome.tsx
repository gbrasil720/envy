import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import { inkColor, useTheme } from '../theme'
import { Gap } from './Gap'
import { type ShortcutItem, Shortcuts } from './Shortcuts'

/** Sub-screen chrome: title + content + shortcuts (no big logo). */
export function ScreenChrome({
  title,
  children,
  hints
}: {
  title: string
  children: ReactNode
  hints?: ShortcutItem[]
}) {
  const theme = useTheme()
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={inkColor(theme.brand)} bold>
        {title}
      </Text>
      <Gap />
      {children}
      {hints && hints.length > 0 ? (
        <>
          <Gap lines={2} />
          <Shortcuts items={hints} />
        </>
      ) : null}
    </Box>
  )
}
