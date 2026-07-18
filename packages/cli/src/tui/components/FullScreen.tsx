import { Box, useStdout } from 'ink'
import { type ReactNode, useEffect, useState } from 'react'
import { inkColor, useTheme } from '../theme'

export function FullScreen({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const { stdout } = useStdout()

  const measure = () => ({
    columns: stdout?.columns && stdout.columns > 0 ? stdout.columns : 80,
    rows: stdout?.rows && stdout.rows > 1 ? stdout.rows : 24
  })

  const [size, setSize] = useState(measure)

  useEffect(() => {
    if (!stdout) return
    const onResize = () => setSize(measure())
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  return (
    <Box
      width={size.columns}
      height={Math.max(size.rows - 1, 10)}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={inkColor(theme.bg)}
    >
      {/* Single wrapper so yoga odd-row leftover doesn't shatter spacers */}
      <Box flexDirection="column" alignItems="center" flexShrink={0}>
        {children}
      </Box>
    </Box>
  )
}
