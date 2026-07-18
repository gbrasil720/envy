/** Shared Envy brand colors (ANSI). Prefer these over ad-hoc escapes. */
export const GREEN = '\x1b[38;2;61;214;140m'
export const GREEN_STD = '\x1b[32m'
export const YELLOW = '\x1b[33m'
export const GRAY = '\x1b[38;5;240m'
export const RESET = '\x1b[0m'

/** Brand hex for Ink / non-ANSI consumers. */
export const BRAND = {
  green: '#3DD68C',
  greenDark: '#2ab87a',
  gray: '#666666',
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6'
} as const

/** @inquirer theme used by headless CLI prompts. */
export const inquirerTheme = {
  prefix: { idle: `${GREEN}?${RESET}` },
  style: {
    answer: (t: string) => `${GREEN}${t}${RESET}`,
    highlight: (t: string) => `${GREEN}${t}${RESET}`,
    selectedChoice: (t: string) => `${GREEN}${t}${RESET}`
  }
}
