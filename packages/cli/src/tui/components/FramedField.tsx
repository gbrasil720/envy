import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import { inkColor, useTheme } from '../theme'

const buttonWidth = (label: string) => label.length + 4

/**
 * Hand-drawn frame with title on the top border, optional CTA block on the right
 * (Yoinks FramedInput pattern).
 */
export function FramedField({
  title,
  width,
  button,
  buttonDim = false,
  children
}: {
  title: string
  width: number
  button?: string
  buttonDim?: boolean
  children: ReactNode
}) {
  const theme = useTheme()
  const inner = width - 2
  const tail = Math.max(0, inner - title.length - 3)
  const buttonW = button ? buttonWidth(button) : 0
  const fill = buttonDim ? theme.muted : theme.brand

  return (
    <Box width={width + buttonW} flexShrink={0}>
      <Box flexDirection="column" width={width}>
        <Text>
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            {'╭─ '}
          </Text>
          <Text color={inkColor(theme.brand)}>{title}</Text>
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            {` ${'─'.repeat(tail)}${button ? '─' : '╮'}`}
          </Text>
        </Text>
        <Box width={width} height={1} overflow="hidden">
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            │{' '}
          </Text>
          <Text color={inkColor(theme.brand)}>❯ </Text>
          <Box flexGrow={1} height={1} overflow="hidden">
            {children}
          </Box>
          {button ? null : (
            <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
              {' '}
              │
            </Text>
          )}
        </Box>
        <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
          {`╰${'─'.repeat(inner)}${button ? '─' : '╯'}`}
        </Text>
      </Box>
      {button ? (
        <Box flexDirection="column" width={buttonW}>
          <Text
            bold
            color={inkColor(fill)}
            dimColor={buttonDim && theme.dimSecondary}
          >
            {'▄'.repeat(buttonW)}
          </Text>
          <Text
            backgroundColor={theme.inverseCta ? undefined : inkColor(fill)}
            color={
              theme.inverseCta ? undefined : (inkColor(theme.bg) ?? '#0a0a0b')
            }
            inverse={theme.inverseCta && !buttonDim}
            dimColor={buttonDim && theme.dimSecondary}
            bold
          >
            {`  ${button}  `}
          </Text>
          <Text
            bold
            color={inkColor(fill)}
            dimColor={buttonDim && theme.dimSecondary}
          >
            {'▀'.repeat(buttonW)}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
