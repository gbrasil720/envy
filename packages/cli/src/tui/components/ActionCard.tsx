import { Box, Text } from 'ink'
import { inkColor, useTheme } from '../theme'

export type ActionCardProps = {
  title: string
  subtitle?: string
  icon?: string
  selected?: boolean
  width?: number
}

export function ActionCard({
  title,
  subtitle,
  icon = '▶',
  selected = false,
  width = 30
}: ActionCardProps) {
  const theme = useTheme()
  const border = selected ? theme.brand : theme.border
  const pad = Math.max(0, width - 4)
  const titleLine = `${icon}  ${title}`.slice(0, pad).padEnd(pad)
  const subLine = (subtitle ?? '').slice(0, pad).padEnd(pad)

  if (selected && theme.inverseCta) {
    return (
      <Box flexDirection="column" width={width} flexShrink={0}>
        <Text color={inkColor(theme.brand)}>
          {'╔' + '═'.repeat(width - 2) + '╗'}
        </Text>
        <Text>
          <Text color={inkColor(theme.brand)}>║</Text>
          <Text
            backgroundColor={inkColor(theme.brand)}
            color={inkColor(theme.bg) ?? '#0a0a0b'}
            bold
          >
            {` ${titleLine} `}
          </Text>
          <Text color={inkColor(theme.brand)}>║</Text>
        </Text>
        <Text>
          <Text color={inkColor(theme.brand)}>║</Text>
          <Text
            backgroundColor={inkColor(theme.brand)}
            color={inkColor(theme.bg) ?? '#0a0a0b'}
          >
            {` ${subLine} `}
          </Text>
          <Text color={inkColor(theme.brand)}>║</Text>
        </Text>
        <Text color={inkColor(theme.brand)}>
          {'╚' + '═'.repeat(width - 2) + '╝'}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width={width} flexShrink={0}>
      <Text color={inkColor(border)} dimColor={!selected && theme.dimSecondary}>
        {'┌' + '─'.repeat(width - 2) + '┐'}
      </Text>
      <Text>
        <Text
          color={inkColor(border)}
          dimColor={!selected && theme.dimSecondary}
        >
          │
        </Text>
        <Text
          color={selected ? inkColor(theme.brand) : inkColor(theme.fg)}
          bold={selected}
        >
          {` ${titleLine} `}
        </Text>
        <Text
          color={inkColor(border)}
          dimColor={!selected && theme.dimSecondary}
        >
          │
        </Text>
      </Text>
      <Text>
        <Text
          color={inkColor(border)}
          dimColor={!selected && theme.dimSecondary}
        >
          │
        </Text>
        <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
          {` ${subLine} `}
        </Text>
        <Text
          color={inkColor(border)}
          dimColor={!selected && theme.dimSecondary}
        >
          │
        </Text>
      </Text>
      <Text color={inkColor(border)} dimColor={!selected && theme.dimSecondary}>
        {'└' + '─'.repeat(width - 2) + '┘'}
      </Text>
    </Box>
  )
}
