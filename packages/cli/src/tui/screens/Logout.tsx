import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useState } from 'react'
import { runLogout } from '../../core/services/logout'
import { ActionCard } from '../components/ActionCard'
import { Gap } from '../components/Gap'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'

type LogoutProps = {
  onDone: () => void
  onBack: () => void
}

export function LogoutScreen({ onDone, onBack }: LogoutProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<'confirm' | 'working' | 'done' | 'error'>(
    'confirm'
  )
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState(0) // 0 = stay, 1 = log out

  useInput((input, key) => {
    if (phase === 'confirm') {
      if (key.escape) {
        onBack()
        return
      }
      if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
        setChoice((c) => 1 - c)
        return
      }
      if (input === 'y') {
        void doLogout()
        return
      }
      if (input === 'n') {
        onBack()
        return
      }
      if (key.return) {
        if (choice === 1) void doLogout()
        else onBack()
      }
      return
    }
    if ((phase === 'done' || phase === 'error') && (key.return || key.escape)) {
      onDone()
    }
  })

  async function doLogout() {
    setPhase('working')
    try {
      await runLogout()
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
      setPhase('error')
    }
  }

  if (phase === 'working') {
    return (
      <ScreenChrome title="log out">
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}> revoking token…</Text>
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'error') {
    return (
      <ScreenChrome
        title="log out"
        hints={[
          ['↵', 'back'],
          ['esc', 'back']
        ]}
      >
        <Text color={inkColor(theme.danger)} bold>
          ✗ {error}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'done') {
    return (
      <ScreenChrome
        title="log out"
        hints={[
          ['↵', 'continue'],
          ['esc', 'continue']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          signed out.
        </Text>
        <Gap />
        <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
          credentials wiped from ~/.envy
        </Text>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome
      title="log out"
      hints={[
        ['←→', 'toggle'],
        ['↵', 'confirm'],
        ['esc', 'cancel']
      ]}
    >
      <Text color={inkColor(theme.fg)}>revoke CLI token on this machine?</Text>
      <Gap lines={2} />
      <Box flexDirection="column" alignItems="center">
        <Box marginBottom={1}>
          <ActionCard
            title="S T A Y"
            subtitle="keep me signed in"
            icon="◎"
            selected={choice === 0}
            width={28}
          />
        </Box>
        <ActionCard
          title="L O G   O U T"
          subtitle="revoke · wipe credentials"
          icon="✗"
          selected={choice === 1}
          width={28}
        />
      </Box>
    </ScreenChrome>
  )
}
