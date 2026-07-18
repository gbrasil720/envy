import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useState } from 'react'
import { runWhoami } from '../../core/services/whoami'
import { Gap } from '../components/Gap'
import { Panel } from '../components/Panel'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'

type WhoamiProps = {
  onBack: () => void
}

export function WhoamiScreen({ onBack }: WhoamiProps) {
  const theme = useTheme()
  const [data, setData] = useState<{
    name: string
    email: string
    version: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useInput((_input, key) => {
    if (key.escape || key.return) onBack()
  })

  useEffect(() => {
    let cancelled = false
    runWhoami()
      .then((r) => {
        if (!cancelled) setData(r)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ScreenChrome
      title="who am i"
      hints={[
        ['esc', 'back'],
        ['↵', 'back']
      ]}
    >
      {error ? (
        <Text color={inkColor(theme.danger)} bold>
          ✗ {error}
        </Text>
      ) : !data ? (
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}> loading…</Text>
        </Text>
      ) : (
        <Panel title="identity" width={40}>
          <Box flexDirection="column">
            <Text>
              <Text color={inkColor(theme.muted)} dimColor>
                {'user     '}
              </Text>
              <Text color={inkColor(theme.brand)} bold>
                {data.name}
              </Text>
            </Text>
            <Text>
              <Text color={inkColor(theme.muted)} dimColor>
                {'email    '}
              </Text>
              <Text color={inkColor(theme.fg)}>{data.email}</Text>
            </Text>
            <Gap />
            <Text>
              <Text color={inkColor(theme.muted)} dimColor>
                {'cli      '}
              </Text>
              <Text color={inkColor(theme.brand)}>{data.version}</Text>
            </Text>
          </Box>
        </Panel>
      )}
    </ScreenChrome>
  )
}
