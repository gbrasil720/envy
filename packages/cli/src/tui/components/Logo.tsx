import { Box, Text } from 'ink'
import { useEffect, useMemo, useState } from 'react'
import { inkColor, useTheme } from '../theme'

// Half-block ENVY — equal letter gaps, clean Y (█ █ / ▀█▀ /  ▀ )
// E=3  N=4  V=3  Y=3  · single space between → width 16
const ART = [
	'█▀▀ █▄ █ █ █ █ █',
	'█▀  █ ▀█ ▀▄▀ ▀█▀',
	// E=▀▀▀ N=▀  ▀ V= ▀  Y= ▀  (spaces matter for alignment)
	'▀▀▀ ▀  ▀  ▀   ▀ '
]

const GRID = ART.map((line) => [...line])
const ROWS = GRID.length

const INTRO_MS = 900
const INTRO_SPREAD_MS = 550
const SWEEP_MS = 1000
const SWEEP_EVERY_MS = 7000
const TILT = 2
const HALF = 2.4
const LIGHTER: Record<string, string> = {
  '█': '▒',
  '▓': '░',
  '▀': '░',
  '▄': '░'
}

const ease = (t: number) => 1 - (1 - t) ** 3

type Phase = 'intro' | 'idle' | 'sweep'

function cellAt(
  ch: string,
  row: number,
  col: number,
  phase: Phase,
  t: number,
  delay: number,
  brand: string,
  muted: string | undefined,
  dim: boolean
) {
  if (ch === ' ' || phase === 'idle') {
    return { ch, color: brand, dim: false }
  }
  if (phase === 'intro') {
    const dt = t - delay
    if (dt < 0) return { ch: ' ', color: brand, dim: false }
    if (dt < 110) return { ch: '░', color: muted, dim }
    if (dt < 220) return { ch: '▒', color: muted, dim }
    return { ch, color: brand, dim: false }
  }
  const cols = GRID[0]?.length ?? 0
  const pMin = -TILT * ROWS - HALF
  const pMax = cols + HALF
  const p = pMin + ease(t / SWEEP_MS) * (pMax - pMin)
  const d = Math.abs(col - (ROWS - 1 - row) * TILT - p)
  if (d <= HALF && 1 - d / HALF > 0.35) {
    return { ch: LIGHTER[ch] ?? ch, color: brand, dim: false }
  }
  return { ch, color: brand, dim: false }
}

function renderRow(
  row: number,
  phase: Phase,
  t: number,
  delays: number[],
  brand: string,
  muted: string | undefined,
  dim: boolean
) {
  const segments: Array<{ text: string; color?: string; dim: boolean }> = []
  for (const [col, ch] of (GRID[row] ?? []).entries()) {
    const cell = cellAt(
      ch,
      row,
      col,
      phase,
      t,
      delays[col] ?? 0,
      brand,
      muted,
      dim
    )
    const last = segments[segments.length - 1]
    if (
      last &&
      ((last.color === cell.color && last.dim === cell.dim) || cell.ch === ' ')
    ) {
      last.text += cell.ch
    } else {
      segments.push({ text: cell.ch, color: cell.color, dim: cell.dim })
    }
  }
  return segments.map((seg, i) => (
    <Text
      key={`${row}-${i}-${seg.text.length}`}
      color={inkColor(seg.color)}
      dimColor={seg.dim}
    >
      {seg.text}
    </Text>
  ))
}

export function Logo() {
  const theme = useTheme()
  const animated =
    Boolean(process.stdout.isTTY) && process.env.ENVY_NO_ANIM !== '1'
  const delays = useMemo(
    () => GRID.map((row) => row.map(() => Math.random() * INTRO_SPREAD_MS)),
    []
  )
  const [phase, setPhase] = useState<Phase>(animated ? 'intro' : 'idle')
  const [t, setT] = useState(0)

  useEffect(() => {
    if (!animated) return
    if (phase === 'idle') {
      const id = setTimeout(() => {
        setT(0)
        setPhase('sweep')
      }, SWEEP_EVERY_MS)
      return () => clearTimeout(id)
    }
    const duration = phase === 'intro' ? INTRO_MS : SWEEP_MS
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      if (elapsed >= duration) {
        setT(0)
        setPhase('idle')
      } else {
        setT(elapsed)
      }
    }, 33)
    return () => clearInterval(id)
  }, [phase, animated])

  const brand = theme.brand
  const muted = inkColor(theme.muted)

  return (
    <Box flexDirection="column" flexShrink={0}>
      {GRID.map((_, row) => (
        <Text key={row}>
          {renderRow(
            row,
            phase,
            t,
            delays[row] ?? [],
            brand,
            muted,
            theme.dimSecondary
          )}
        </Text>
      ))}
    </Box>
  )
}
