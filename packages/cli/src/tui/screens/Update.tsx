import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useState } from 'react'
import { checkUpdate, runUpdate } from '../../core/services/update'
import { ActionCard } from '../components/ActionCard'
import { Gap } from '../components/Gap'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'

type UpdateProps = {
  onBack: () => void
  onUpdated?: () => void
}

type Phase =
  | 'checking'
  | 'latest'
  | 'available'
  | 'installing'
  | 'done'
  | 'error'

export function UpdateScreen({ onBack, onUpdated }: UpdateProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<Phase>('checking')
  const [current, setCurrent] = useState('')
  const [latest, setLatest] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState('')
  const [choice, setChoice] = useState(1) // default install

  useInput((_input, key) => {
    if (
      (phase === 'latest' || phase === 'done' || phase === 'error') &&
      (key.return || key.escape)
    ) {
      onBack()
      return
    }
    if (phase === 'available') {
      if (key.escape) {
        onBack()
        return
      }
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
        setChoice((c) => 1 - c)
        return
      }
      if (key.return) {
        if (choice === 0) {
          onBack()
          return
        }
        void install()
      }
    }
  })

  useEffect(() => {
    let cancelled = false
    checkUpdate({ force: true })
      .then((c) => {
        if (cancelled) return
        setCurrent(c.currentVersion)
        setLatest(c.latestVersion)
        setPhase(c.updateAvailable ? 'available' : 'latest')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Check failed')
        setPhase('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function install() {
    setPhase('installing')
    try {
      const result = await runUpdate(
        { yes: true, force: true },
        { onInstalling: (m) => setMethod(m) }
      )
      if (result) {
        setPhase('done')
        onUpdated?.()
      } else {
        setPhase('latest')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      setPhase('error')
    }
  }

  if (phase === 'checking') {
    return (
      <ScreenChrome title="update">
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}> checking registry…</Text>
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'latest') {
    return (
      <ScreenChrome
        title="update"
        hints={[
          ['↵', 'back'],
          ['esc', 'back']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          already latest.
        </Text>
        <Gap />
        <Text color={inkColor(theme.muted)} dimColor>
          v{current}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'available') {
    return (
      <ScreenChrome
        title="update available"
        hints={[
          ['←→', 'toggle'],
          ['↵', 'confirm'],
          ['esc', 'back']
        ]}
      >
        <Text>
          <Text color={inkColor(theme.muted)} dimColor>
            v{current}
          </Text>
          <Text color={inkColor(theme.fg)}>{'  →  '}</Text>
          <Text color={inkColor(theme.brand)} bold>
            v{latest}
          </Text>
        </Text>
        <Gap lines={2} />
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={1}>
            <ActionCard
              title="S K I P"
              subtitle="not now"
              icon="◎"
              selected={choice === 0}
              width={26}
            />
          </Box>
          <ActionCard
            title="I N S T A L L"
            subtitle="npm / bun global"
            icon="↑"
            selected={choice === 1}
            width={26}
          />
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'installing') {
    return (
      <ScreenChrome title="update">
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}>
            {`  installing via ${method || 'package manager'}…`}
          </Text>
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'error') {
    return (
      <ScreenChrome
        title="update"
        hints={[
          ['↵', 'back'],
          ['esc', 'back']
        ]}
      >
        <Text color={inkColor(theme.danger)} bold>
          ✗ {error}
        </Text>
        <Gap />
        <Text color={inkColor(theme.muted)} dimColor>
          try: npm install -g useenvy@latest
        </Text>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome
      title="updated."
      hints={[
        ['↵', 'back'],
        ['esc', 'back']
      ]}
    >
      <Text color={inkColor(theme.brand)} bold>
        v{current} → v{latest}
      </Text>
      <Gap />
      <Text color={inkColor(theme.muted)} dimColor>
        restart the tui to load the new build
      </Text>
    </ScreenChrome>
  )
}
