import gradient from 'gradient-string'
import pkg from '../../package.json'

const GREEN = '\x1b[38;2;61;214;140m'
const GRAY = '\x1b[38;5;240m'
const RESET = '\x1b[0m'

const ENVY_ASCII = `
███████╗███╗   ██╗██╗   ██╗██╗   ██╗
██╔════╝████╗  ██║██║   ██║╚██╗ ██╔╝
█████╗  ██╔██╗ ██║██║   ██║ ╚████╔╝
██╔══╝  ██║╚██╗██║╚██╗ ██╔╝  ╚██╔╝
███████╗██║ ╚████║ ╚████╔╝    ██║
╚══════╝╚═╝  ╚═══╝  ╚═══╝     ╚═╝
`

const envyGradient = gradient(['#3DD68C', '#2ab87a'])

function infoBox(lines: { label: string; value: string }[]): string {
  const labelWidth = Math.max(...lines.map((l) => l.label.length))
  const valueWidth = Math.max(...lines.map((l) => l.value.length))
  const innerWidth = labelWidth + valueWidth + 6
  const border = '─'.repeat(innerWidth)

  const rows = lines.map(({ label, value }) => {
    const paddedLabel = `${GRAY}${label.padEnd(labelWidth)}${RESET}`
    const coloredValue = `${GREEN}${value.padEnd(valueWidth)}${RESET}`
    return `│  ${paddedLabel}  ${coloredValue}  │`
  })

  return [
    `┌${border}┐`,
    `│${''.padEnd(innerWidth)}│`,
    ...rows,
    `│${''.padEnd(innerWidth)}│`,
    `└${border}┘`
  ].join('\n')
}

export function printWelcomeBanner(user?: { name: string; email: string }) {
  console.clear()
  console.log(envyGradient(ENVY_ASCII))
  console.log(`${GREEN}  Stop sharing .env files on Slack.\n${RESET}`)

  if (user) {
    console.log(
      infoBox([
        { label: 'User', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Version', value: `v${pkg.version}` }
      ])
    )
    console.log()
  }
}
