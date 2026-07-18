import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'
import { getAuth } from '../../core/auth'
import { getConfig } from '../../core/config'
import { Gap } from '../components/Gap'
import { inkColor, useTheme } from '../theme'
import type { ScreenId } from '../types'

type PaletteProps = {
  onNavigate: (screen: ScreenId) => void
  onQuit: () => void
  onBack: () => void
}

type Entry = {
  id: ScreenId | 'quit'
  label: string
  hint: string
  when?: 'always' | 'auth' | 'linked' | 'guest'
}

const ENTRIES: Entry[] = [
  { id: 'push', label: 'push', hint: 'upload .env*', when: 'linked' },
  { id: 'pull', label: 'pull', hint: 'download secrets', when: 'linked' },
  { id: 'init', label: 'init', hint: 'link directory', when: 'auth' },
  { id: 'projects', label: 'projects', hint: 'list / create', when: 'auth' },
  { id: 'open', label: 'open', hint: 'dashboard in browser', when: 'auth' },
  { id: 'whoami', label: 'whoami', hint: 'current user', when: 'auth' },
  { id: 'login', label: 'login', hint: 'authenticate', when: 'guest' },
  { id: 'logout', label: 'logout', hint: 'revoke token', when: 'auth' },
  { id: 'update', label: 'update', hint: 'self-update CLI', when: 'always' },
  { id: 'help', label: 'help', hint: 'keyboard map', when: 'always' },
  { id: 'quit', label: 'quit', hint: 'exit', when: 'always' }
]

export function PaletteScreen({ onNavigate, onQuit, onBack }: PaletteProps) {
  const theme = useTheme()
  const auth = Boolean(getAuth())
  const linked = Boolean(getConfig())
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  const items = useMemo(() => {
    const filtered = ENTRIES.filter((e) => {
      if (e.when === 'guest' && auth) return false
      if (e.when === 'auth' && !auth) return false
      if (e.when === 'linked' && !linked) return false
      if (!query) return true
      const q = query.toLowerCase()
      return e.label.includes(q) || e.hint.includes(q)
    })
    return filtered
  }, [auth, linked, query])

  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0

  useInput((input, key) => {
    if (key.escape) {
      onBack()
      return
    }
    if (key.upArrow) {
      setIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
      return
    }
    if (key.downArrow) {
      setIndex((i) => (i >= items.length - 1 ? 0 : i + 1))
      return
    }
    if (key.return) {
      const item = items[safeIndex]
      if (!item) return
      if (item.id === 'quit') onQuit()
      else onNavigate(item.id)
      return
    }
    if (key.backspace || key.delete) {
      setQuery((q) => q.slice(0, -1))
      setIndex(0)
      return
    }
    if (input && !key.ctrl && !key.meta) {
      setQuery((q) => q + input)
      setIndex(0)
    }
  })

  return (
    <Box flexDirection="column" alignItems="center" width={48}>
      <Text color={inkColor(theme.brand)} bold>
        command palette
      </Text>
      <Gap />
      <Text>
        <Text color={inkColor(theme.brand)}>❯ </Text>
        <Text color={inkColor(theme.fg)}>{query}</Text>
        <Text color={inkColor(theme.muted)} dimColor>
          █
        </Text>
      </Text>
      <Gap />
      <Box flexDirection="column" width={48}>
        {items.length === 0 ? (
          <Text color={inkColor(theme.muted)} dimColor>
            no matches
          </Text>
        ) : (
          items.map((item, i) => {
            const sel = i === safeIndex
            return (
              <Text key={item.id}>
                <Text
                  color={sel ? inkColor(theme.brand) : inkColor(theme.muted)}
                  bold={sel}
                >
                  {sel ? '❯ ' : '  '}
                  {item.label.padEnd(12)}
                </Text>
                <Text
                  color={inkColor(theme.muted)}
                  dimColor={theme.dimSecondary}
                >
                  {item.hint}
                </Text>
              </Text>
            )
          })
        )}
      </Box>
      <Gap />
      <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
        type to filter · ↑↓ · ↵ run · esc back
      </Text>
    </Box>
  )
}
