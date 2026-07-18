import { Box, Text } from 'ink'
import type { SecretsDiff } from '../../core/services/push'
import { colors } from '../theme'

export function DiffList({
  diff,
  environment
}: {
  diff: SecretsDiff
  environment: string
}) {
  return (
    <Box flexDirection="column">
      <Text dimColor>Changes to "{environment}":</Text>
      <Box flexDirection="column" marginTop={1}>
        {diff.added.map((k) => (
          <Text key={`+${k}`} color="green">
            + {k}
          </Text>
        ))}
        {diff.changed.map((k) => (
          <Text key={`~${k}`} color={colors.warn}>
            ~ {k}
          </Text>
        ))}
        {diff.unchanged.map((k) => (
          <Text key={`=${k}`} dimColor>
            {'  '}
            {k}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text color="green">+{diff.added.length} added</Text>
          {'  '}
          <Text color={colors.warn}>~{diff.changed.length} changed</Text>
          {'  '}
          <Text dimColor>{diff.unchanged.length} unchanged</Text>
        </Text>
      </Box>
    </Box>
  )
}
