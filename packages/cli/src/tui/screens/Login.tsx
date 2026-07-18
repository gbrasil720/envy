import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useState } from 'react'
import { runLogin } from '../../core/services/login'
import { FramedField } from '../components/FramedField'
import { Gap } from '../components/Gap'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'
import type { SessionUser } from '../types'

type LoginProps = {
  onDone: (user: SessionUser) => void
  onBack: () => void
}

export function LoginScreen({ onDone, onBack }: LoginProps) {
  const theme = useTheme()
  const [status, setStatus] = useState<
    'starting' | 'waiting' | 'done' | 'error'
  >('starting')
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<SessionUser>(null)

  useInput((_input, key) => {
    if (key.escape) onBack()
    if (status === 'error' && key.return) onBack()
    if (status === 'done' && key.return) onDone(user)
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await runLogin({
          onStart: (u) => {
            if (!cancelled) {
              setUrl(u)
              setStatus('waiting')
            }
          },
          onWaiting: () => {
            if (!cancelled) setStatus('waiting')
          }
        })
        if (cancelled) return
        setUser({ name: result.name, email: result.email })
        setStatus('done')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Login failed')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-advance on success after a beat
  useEffect(() => {
    if (status !== 'done' || !user) return
    const id = setTimeout(() => onDone(user), 1200)
    return () => clearTimeout(id)
  }, [status, user, onDone])

  return (
    <ScreenChrome
      title="log in"
      hints={[
        ['esc', 'back'],
        ...(status === 'done' || status === 'error'
          ? ([['↵', 'continue']] as [string, string][])
          : [])
      ]}
    >
      {(status === 'starting' || status === 'waiting') && (
        <Box flexDirection="column" alignItems="center">
          <FramedField title="browser auth" width={48} button="wait" buttonDim>
            <Text color={inkColor(theme.muted)} dimColor>
              {url
                ? url.length > 36
                  ? `${url.slice(0, 35)}…`
                  : url
                : 'starting session…'}
            </Text>
          </FramedField>
          <Gap />
          <Text>
            <Text color={inkColor(theme.brand)}>
              <Spinner type="dots" />
            </Text>
            <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
              {'  waiting for authorization…'}
            </Text>
          </Text>
          {url ? (
            <>
              <Gap />
              <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
                if it didn't open, paste the url above
              </Text>
            </>
          ) : null}
        </Box>
      )}

      {status === 'done' && user ? (
        <Box flexDirection="column" alignItems="center">
          <Text color={inkColor(theme.brand)} bold>
            you're in.
          </Text>
          <Gap />
          <Text color={inkColor(theme.fg)}>
            {user.name}
            {user.email ? (
              <Text color={inkColor(theme.muted)} dimColor>
                {`  ·  ${user.email}`}
              </Text>
            ) : null}
          </Text>
        </Box>
      ) : null}

      {status === 'error' ? (
        <Box flexDirection="column" alignItems="center" width={48}>
          <Text color={inkColor(theme.danger)} bold>
            ✗ {error}
          </Text>
        </Box>
      ) : null}
    </ScreenChrome>
  )
}
