import { Text, useInput } from 'ink'
import { useEffect, useState } from 'react'
import { runOpen } from '../../core/services/open'
import { Gap } from '../components/Gap'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'

type OpenProps = {
  onBack: () => void
}

export function OpenScreen({ onBack }: OpenProps) {
  const theme = useTheme()
  const [result, setResult] = useState<ReturnType<typeof runOpen> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useInput((_input, key) => {
    if (key.escape || key.return) onBack()
  })

  useEffect(() => {
    try {
      setResult(runOpen())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open')
    }
  }, [])

  useEffect(() => {
    if (!result || error) return
    const id = setTimeout(onBack, 1400)
    return () => clearTimeout(id)
  }, [result, error, onBack])

  return (
    <ScreenChrome
      title="open"
      hints={[
        ['esc', 'back'],
        ['↵', 'back']
      ]}
    >
      {error ? (
        <Text color={inkColor(theme.danger)} bold>
          ✗ {error}
        </Text>
      ) : result ? (
        <>
          <Text color={inkColor(theme.brand)} bold>
            opened in browser.
          </Text>
          <Gap />
          {result.projectLabel ? (
            <Text color={inkColor(theme.fg)}>{result.projectLabel}</Text>
          ) : (
            <Text color={inkColor(theme.warn)}>
              no project linked — dashboard root
            </Text>
          )}
          <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
            {result.url.length > 52
              ? `${result.url.slice(0, 51)}…`
              : result.url}
          </Text>
        </>
      ) : null}
    </ScreenChrome>
  )
}
