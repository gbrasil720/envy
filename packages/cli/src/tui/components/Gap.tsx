import { Box, Text } from 'ink'

/** Fixed blank rows — never flex-shrink (Yoga crushes empty Boxes first). */
export function Gap({ lines = 1 }: { lines?: number }) {
  return (
    <Box flexDirection="column" flexShrink={0}>
      {Array.from({ length: lines }, (_, i) => (
        <Text key={i}> </Text>
      ))}
    </Box>
  )
}
