import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'
import { getAuth } from '../../core/auth'
import { getConfig } from '../../core/config'
import { ActionCard } from '../components/ActionCard'
import { Gap } from '../components/Gap'
import { Logo } from '../components/Logo'
import { Shortcuts } from '../components/Shortcuts'
import { StatusPillsValues } from '../components/StatusPills'
import { inkColor, useTheme } from '../theme'
import type { ScreenId, SessionUser } from '../types'

type HomeProps = {
  user: SessionUser
  updateAvailable?: string | null
  onNavigate: (screen: ScreenId) => void
  onQuit: () => void
  onOpenPalette: () => void
}

type CardDef = {
  id: ScreenId | 'quit'
  title: string
  subtitle: string
  icon: string
  hotkey?: string
}

export function HomeScreen({
  user,
  updateAvailable,
  onNavigate,
  onQuit,
  onOpenPalette
}: HomeProps) {
  const theme = useTheme()
  const auth = getAuth()
  const config = getConfig()
  const loggedIn = Boolean(auth)
  const linked = Boolean(config)

  const cards: CardDef[] = useMemo(() => {
    if (!loggedIn) {
      return [
        {
          id: 'login',
          title: 'L O G   I N',
          subtitle: 'open browser · authenticate',
          icon: '◈',
          hotkey: 'g'
        }
      ]
    }
    if (!linked) {
      return [
        {
          id: 'init',
          title: 'L I N K   I T',
          subtitle: 'connect this directory',
          icon: '◎',
          hotkey: 'i'
        },
        {
          id: 'projects',
          title: 'P R O J E C T S',
          subtitle: 'list or create',
          icon: '▦',
          hotkey: 'j'
        }
      ]
    }
    return [
      {
        id: 'push',
        title: 'P U S H',
        subtitle: 'upload local .env*',
        icon: '▶',
        hotkey: 'p'
      },
      {
        id: 'pull',
        title: 'P U L L',
        subtitle: 'download secrets',
        icon: '◀',
        hotkey: 'l'
      }
    ]
  }, [loggedIn, linked])

  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(index, cards.length - 1)

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setIndex((i) => (i <= 0 ? cards.length - 1 : i - 1))
      return
    }
    if (key.downArrow || input === 'j') {
      setIndex((i) => (i >= cards.length - 1 ? 0 : i + 1))
      return
    }
    if (key.return) {
      const card = cards[safeIndex]
      if (!card) return
      if (card.id === 'quit') onQuit()
      else onNavigate(card.id)
      return
    }
    if (input === '/' || input === ':') {
      onOpenPalette()
      return
    }
    if (input === '?') {
      onNavigate('help')
      return
    }
    if (input === 'q') {
      onQuit()
      return
    }

    // Hotkeys
    const map: Record<string, ScreenId | 'quit'> = {
      p: 'push',
      l: 'pull',
      i: 'init',
      j: 'projects',
      w: 'whoami',
      o: 'open',
      u: 'update',
      g: 'login'
    }
    const target = map[input.toLowerCase()]
    if (target) {
      if (target === 'push' && (!loggedIn || !linked)) return
      if (target === 'pull' && (!loggedIn || !linked)) return
      if (target === 'init' && !loggedIn) return
      if (target === 'projects' && !loggedIn) return
      if (target === 'whoami' && !loggedIn) return
      if (target === 'open' && !loggedIn) return
      if (target === 'login' && loggedIn) {
        onNavigate('logout')
        return
      }
      onNavigate(target as ScreenId)
    }
  })

  const tagline = 'stop sharing .env on slack.'

  const hints: Array<[string, string]> = loggedIn
    ? linked
      ? [
          ['↑↓', 'select'],
          ['↵', 'go'],
          ['p', 'push'],
          ['l', 'pull'],
          ['/', 'more'],
          ['^t', 'theme'],
          ['q', 'quit']
        ]
      : [
          ['↑↓', 'select'],
          ['↵', 'go'],
          ['i', 'init'],
          ['/', 'more'],
          ['^t', 'theme'],
          ['q', 'quit']
        ]
    : [
        ['↵', 'log in'],
        ['/', 'more'],
        ['^t', 'theme'],
        ['q', 'quit']
      ]

  return (
    <Box flexDirection="column" alignItems="center">
      <Logo />
      <Gap />
      <Text color={inkColor(theme.brand)}>{tagline}</Text>
      <Gap />
      <StatusPillsValues
        user={user}
        project={
          config
            ? {
                projectSlug: config.project_slug,
                environment: config.environment
              }
            : null
        }
        updateAvailable={updateAvailable}
      />
      <Gap lines={2} />

      <Box flexDirection="column" alignItems="center">
        {cards.map((card, i) => (
          <Box key={card.id} marginBottom={i < cards.length - 1 ? 1 : 0}>
            <ActionCard
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              selected={i === safeIndex}
            />
          </Box>
        ))}
      </Box>

      {loggedIn && linked ? (
        <>
          <Gap />
          <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
            {'i init  ·  j projects  ·  o open  ·  u update  ·  ? help'}
          </Text>
        </>
      ) : null}

      <Gap lines={2} />
      <Shortcuts items={hints} />
    </Box>
  )
}
