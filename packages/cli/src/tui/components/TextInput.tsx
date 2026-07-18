import { Box, Text, useInput } from 'ink'
import { useState } from 'react'
import { inkColor, useTheme } from '../theme'

type TextInputProps = {
  label: string
  defaultValue?: string
  onSubmit: (value: string) => void
  onCancel?: () => void
  validate?: (value: string) => string | true
}

export function TextInput({
  label,
  defaultValue = '',
  onSubmit,
  onCancel,
  validate
}: TextInputProps) {
  const theme = useTheme()
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.()
      return
    }
    if (key.return) {
      const result = validate?.(value) ?? true
      if (result !== true) {
        setError(result)
        return
      }
      onSubmit(value)
      return
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1))
      setError(null)
      return
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v) => v + input)
      setError(null)
    }
  })

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
          {label}{' '}
        </Text>
        <Text color={inkColor(theme.brand)}>{value}</Text>
        <Text color={inkColor(theme.muted)} dimColor>
          █
        </Text>
      </Text>
      {error ? (
        <Text color={inkColor(theme.danger)}>{error}</Text>
      ) : (
        <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
          enter confirm · esc cancel
        </Text>
      )}
    </Box>
  )
}
