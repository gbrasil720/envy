import { Text } from 'ink'
import { useEffect, useState } from 'react'
import { colors } from '../theme'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function Spinner({ label }: { label: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % FRAMES.length), 80)
    return () => clearInterval(id)
  }, [])
  return (
    <Text>
      <Text color={colors.brand}>{FRAMES[i]}</Text> {label}
    </Text>
  )
}
