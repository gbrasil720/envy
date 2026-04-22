import pc from 'picocolors'

const IS_TTY = process.stdout.isTTY

let _spinner: ReturnType<typeof createSpinner> | null = null

export const output = {
  success(message: string): void {
    console.log(`${pc.green('✓')} ${message}`)
  },

  error(message: string, suggestion?: string): void {
    console.error(`${pc.red('✗')} ${pc.red('Error:')} ${message}`)
    if (suggestion) {
      console.error(`  ${pc.dim('→')} ${pc.dim(suggestion)}`)
    }
  },

  warn(message: string): void {
    console.warn(`${pc.yellow('⚠')} ${message}`)
  },

  info(message: string): void {
    console.log(`${pc.blue('ℹ')} ${message}`)
  },

  dim(message: string): void {
    console.log(pc.dim(message))
  },

  blank(): void {
    console.log('')
  },

  raw(text: string): void {
    console.log(text)
  },

  masked(label: string, value: string): void {
    const dots = '•'.repeat(Math.min(value.length, 20))
    console.log(`  ${pc.dim(label)}: ${pc.yellow(dots)}`)
  },

  spinner(message: string) {
    _spinner = createSpinner(message)
    return _spinner
  },

  stopSpinner(): void {
    _spinner?.stop()
    _spinner = null
  },

  secretsTable(
    secrets: { key: string; updatedAt: string; updatedBy: string }[]
  ): void {
    if (secrets.length === 0) {
      output.dim('No secrets found.')
      return
    }

    const maxKey = Math.max(...secrets.map((s) => s.key.length), 3)

    console.log(
      pc.dim(
        `${'KEY'.padEnd(maxKey)}   ${'UPDATED BY'.padEnd(20)}   UPDATED AT`
      )
    )
    console.log(pc.dim('─'.repeat(maxKey + 44)))

    for (const secret of secrets) {
      console.log(
        `${pc.cyan(secret.key.padEnd(maxKey))}   ${secret.updatedBy.padEnd(20)}   ${pc.dim(formatDate(secret.updatedAt))}`
      )
    }
  },

  diffTable(diff: {
    both: string[]
    only_from: string[]
    only_to: string[]
    from: string
    to: string
  }): void {
    if (diff.only_from.length === 0 && diff.only_to.length === 0) {
      output.success(`[${diff.from}] and [${diff.to}] are in sync`)
      return
    }

    for (const key of diff.only_from) {
      console.log(
        `${pc.red('−')} ${pc.red(key)} ${pc.dim(`(only in [${diff.from}])`)}`
      )
    }

    for (const key of diff.only_to) {
      console.log(
        `${pc.green('+')} ${pc.green(key)} ${pc.dim(`(only in [${diff.to}])`)}`
      )
    }
  },

  // Prints the error and throws — process.exit is handled by index.ts
  fatal(err: unknown): never {
    output.stopSpinner()

    if (isEnvyError(err)) {
      output.error(err.message, err.suggestion)
      if (process.env.ENVY_DEBUG) {
        console.error(pc.dim(err.stack ?? ''))
      }
    } else {
      output.error(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      if (process.env.ENVY_DEBUG && err instanceof Error) {
        console.error(pc.dim(err.stack ?? ''))
      }
    }

    throw err instanceof Error ? err : new Error(String(err))
  }
}

function createSpinner(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0

  if (!IS_TTY) {
    process.stdout.write(`${message}...\n`)
    return { stop: () => {} }
  }

  const interval = setInterval(() => {
    process.stdout.write(`\r${pc.cyan(frames[i % frames.length])} ${message}`)
    i++
  }, 80)

  return {
    stop() {
      clearInterval(interval)
      process.stdout.write('\r\x1b[K')
    }
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function isEnvyError(
  err: unknown
): err is {
  message: string
  suggestion: string
  exitCode: number
  stack?: string
} {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'EnvyError'
  )
}
