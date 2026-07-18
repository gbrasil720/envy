import { Box, Text, useInput } from 'ink'
import { Gap } from '../components/Gap'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'

const ROWS: [string, string][] = [
  ['p', 'push secrets'],
  ['l', 'pull secrets'],
  ['i', 'init / link project'],
  ['j', 'projects'],
  ['g', 'log in'],
  ['o', 'open dashboard'],
  ['u', 'update CLI'],
  ['w', 'whoami'],
  ['/', 'command palette'],
  ['^t', 'cycle theme'],
  ['?', 'this help'],
  ['q', 'quit'],
  ['esc', 'back']
]

export function HelpScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme()
  useInput((_input, key) => {
    if (key.escape || key.return) onBack()
  })

  return (
    <ScreenChrome
      title="keyboard"
      hints={[
        ['esc', 'back'],
        ['↵', 'back']
      ]}
    >
      <Box flexDirection="column" width={40}>
        {ROWS.map(([key, action]) => (
          <Text key={key}>
            <Text color={inkColor(theme.brand)} bold>
              {key.padEnd(6)}
            </Text>
            <Text color={inkColor(theme.fg)}> {action}</Text>
          </Text>
        ))}
      </Box>
      <Gap />
      <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
        headless: envy push --yes · envy pull --env staging
      </Text>
    </ScreenChrome>
  )
}
