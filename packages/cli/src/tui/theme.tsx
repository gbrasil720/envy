import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

export const THEME_MODES = ['night', 'day', 'auto'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export type Theme = {
  mode: ThemeMode
  /** Terminal background override. Undefined = use terminal default. */
  bg?: string
  fg: string
  muted: string
  brand: string
  brandDim: string
  danger: string
  warn: string
  border: string
  inverseCta: boolean
  dimSecondary: boolean
}

const NIGHT: Theme = {
  mode: 'night',
  bg: '#0a0a0b',
  fg: '#f4f4f5',
  muted: '#71717a',
  brand: '#3DD68C',
  brandDim: '#2ab87a',
  danger: '#f87171',
  warn: '#fbbf24',
  border: '#3f3f46',
  inverseCta: true,
  dimSecondary: false
}

const DAY: Theme = {
  mode: 'day',
  bg: '#fafafa',
  fg: '#18181b',
  muted: '#52525b',
  brand: '#16a34a',
  brandDim: '#15803d',
  danger: '#dc2626',
  warn: '#ca8a04',
  border: '#d4d4d8',
  inverseCta: false,
  dimSecondary: false
}

const AUTO: Theme = {
  mode: 'auto',
  bg: undefined,
  fg: undefined as unknown as string, // use terminal default via undefined colors
  muted: undefined as unknown as string,
  brand: '#3DD68C',
  brandDim: '#2ab87a',
  danger: '#f87171',
  warn: '#fbbf24',
  border: undefined as unknown as string,
  inverseCta: true,
  dimSecondary: true
}

// For auto mode, leave most colors unset so Ink uses terminal defaults
const AUTO_RESOLVED: Theme = {
  mode: 'auto',
  bg: undefined,
  fg: '', // empty = don't set color (handled in components)
  muted: '',
  brand: '#3DD68C',
  brandDim: '#2ab87a',
  danger: '#ef4444',
  warn: '#eab308',
  border: '',
  inverseCta: true,
  dimSecondary: true
}

function themeFor(mode: ThemeMode): Theme {
  if (mode === 'night') return NIGHT
  if (mode === 'day') return DAY
  return AUTO_RESOLVED
}

type ThemeCtx = {
  theme: Theme
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  cycleMode: () => void
}

const ThemeContext = createContext<ThemeCtx | null>(null)

export function ThemeProvider({
  initialMode = 'night',
  children
}: {
  initialMode?: ThemeMode
  children: ReactNode
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode)
  const cycleMode = useCallback(() => {
    setMode((m) => {
      const i = THEME_MODES.indexOf(m)
      return THEME_MODES[(i + 1) % THEME_MODES.length] as ThemeMode
    })
  }, [])

  const value = useMemo(
    () => ({
      theme: themeFor(mode),
      mode,
      setMode,
      cycleMode
    }),
    [mode, cycleMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) return NIGHT
  return ctx.theme
}

export function useThemeControls(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return {
      theme: NIGHT,
      mode: 'night',
      setMode: () => {},
      cycleMode: () => {}
    }
  }
  return ctx
}

export function isThemeMode(v: unknown): v is ThemeMode {
  return typeof v === 'string' && (THEME_MODES as readonly string[]).includes(v)
}

/** Resolve color: empty string means "terminal default" (pass undefined to Ink). */
export function inkColor(c: string | undefined): string | undefined {
  if (c === undefined || c === '') return undefined
  return c
}

// silence unused in case of tree-shake
void AUTO

/** @deprecated Prefer useTheme() — kept for legacy screens during redesign. */
export const colors = {
  brand: NIGHT.brand,
  brandDark: NIGHT.brandDim,
  muted: 'gray',
  error: NIGHT.danger,
  warn: NIGHT.warn,
  info: 'cyan',
  border: NIGHT.brand,
  selected: NIGHT.brand,
  dim: 'gray'
} as const
