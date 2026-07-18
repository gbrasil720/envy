import { Box, Text, useInput } from 'ink'
import { useState } from 'react'
import { inkColor, useTheme } from '../theme'

type ConfirmProps = {
  message: string
  defaultYes?: boolean
  onConfirm: (yes: boolean) => void
}

export function Confirm({
  message,
  defaultYes = true,
  onConfirm
}: ConfirmProps) {
  const theme = useTheme()
  const [yes, setYes] = useState(defaultYes)

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setYes((v) => !v)
      return
    }
    if (input === 'y') {
      onConfirm(true)
      return
    }
    if (input === 'n') {
      onConfirm(false)
      return
    }
    if (key.return) onConfirm(yes)
    if (key.escape) onConfirm(false)
  })

  return (
    <Box flexDirection="column">
      <Text color={inkColor(theme.fg)}>{message}</Text>
      <Box marginTop={1}>
        <Text
          color={yes ? inkColor(theme.brand) : inkColor(theme.muted)}
          inverse={yes}
          bold={yes}
        >
          {' '}
          Yes{' '}
        </Text>
        <Text> </Text>
        <Text
          color={!yes ? inkColor(theme.brand) : inkColor(theme.muted)}
          inverse={!yes}
          bold={!yes}
        >
          {' '}
          No{' '}
        </Text>
      </Box>
      <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
        ←→ toggle · y/n · enter · esc
      </Text>
    </Box>
  )
}
