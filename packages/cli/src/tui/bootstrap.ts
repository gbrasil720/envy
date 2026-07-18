/** Alternate screen buffer — takes over the terminal like Yoinks / full-screen apps. */

const ENTER = '\x1b[?1049h\x1b[H'
const LEAVE = '\x1b[?1006l\x1b[?1000l\x1b[?1049l'

let active = false

export function enterAltScreen(): void {
  if (!process.stdout.isTTY || active) return
  process.stdout.write(ENTER)
  active = true
}

export function leaveAltScreen(): void {
  if (!active) return
  process.stdout.write(LEAVE)
  active = false
}

/** Register process-level restore so crashes don't leave the terminal broken. */
export function installAltScreenGuards(): void {
  if (!process.stdout.isTTY) return

  const restore = () => leaveAltScreen()
  process.on('exit', restore)

  for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
    process.on(event, (error: unknown) => {
      leaveAltScreen()
      console.error(error)
      process.exit(1)
    })
  }
}
