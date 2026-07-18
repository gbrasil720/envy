import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { inkColor, useTheme } from '../theme'
import { Gap } from './Gap'

/** Fixed 3-row progress slot so layout never jumps. */
export function ProgressBlock({
  label,
  percent
}: {
  label: string
  /** 0–1, or undefined for indeterminate spinner */
  percent?: number
}) {
  const theme = useTheme()
  const width = 32
  const filled =
    percent === undefined
      ? 0
      : Math.max(0, Math.min(width, Math.round(percent * width)))
  const bar =
    percent === undefined
      ? null
      : '█'.repeat(filled) + '░'.repeat(width - filled)

  return (
    <Box flexDirection="column" alignItems="center" height={3} flexShrink={0}>
      {bar ? (
        <Text color={inkColor(theme.brand)}>{bar}</Text>
      ) : (
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
        </Text>
      )}
      <Gap />
      <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
        {label}
      </Text>
    </Box>
  )
}
