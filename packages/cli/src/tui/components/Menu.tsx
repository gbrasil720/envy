import { Box, Text, useInput } from 'ink'
import { useState } from 'react'
import { colors } from '../theme'

export type MenuItem = {
  id: string
  label: string
  hint?: string
  key?: string
  disabled?: boolean
}

type MenuProps = {
  items: MenuItem[]
  onSelect: (id: string) => void
  onCancel?: () => void
}

export function Menu({ items, onSelect, onCancel }: MenuProps) {
  const enabled = items.filter((i) => !i.disabled)
  const [index, setIndex] = useState(0)

  useInput((input, key) => {
    if (key.escape && onCancel) {
      onCancel()
      return
    }
    if (key.upArrow) {
      setIndex((i) => (i <= 0 ? enabled.length - 1 : i - 1))
      return
    }
    if (key.downArrow) {
      setIndex((i) => (i >= enabled.length - 1 ? 0 : i + 1))
      return
    }
    if (key.return) {
      const item = enabled[index]
      if (item) onSelect(item.id)
      return
    }
    // Single-key shortcuts
    const match = enabled.find(
      (i) => i.key && i.key.toLowerCase() === input.toLowerCase()
    )
    if (match) onSelect(match.id)
  })

  return (
    <Box flexDirection="column">
      {items.map((item) => {
        if (item.disabled) {
          return (
            <Box key={item.id}>
              <Text dimColor>
                {'  '}
                {item.key ? `[${item.key}] ` : '    '}
                {item.label}
              </Text>
            </Box>
          )
        }
        const enabledIdx = enabled.findIndex((e) => e.id === item.id)
        const selected = enabledIdx === index
        return (
          <Box key={item.id}>
            <Text
              color={selected ? colors.brand : undefined}
              bold={selected}
              inverse={selected}
            >
              {selected ? '› ' : '  '}
              {item.key ? `[${item.key}] ` : '    '}
              {item.label}
              {item.hint ? <Text dimColor> {item.hint}</Text> : null}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
