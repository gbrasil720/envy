export const EXIT = {
  OK: 0,
  USAGE: 1,
  AUTH: 2,
  NETWORK: 3,
  PERMISSION: 4
} as const

type ExitCode = (typeof EXIT)[keyof typeof EXIT]

type EnvyErrorOptions = {
  suggestion?: string
  code?: string
  exitCode?: ExitCode
  cause?: unknown
}

export class EnvyError extends Error {
  suggestion: string
  code: string
  exitCode: ExitCode

  constructor(message: string, options: EnvyErrorOptions = {}) {
    super(message)
    this.name = 'EnvyError'
    this.suggestion = options.suggestion ?? ''
    this.code = options.code ?? 'UNKNOWN'
    this.exitCode = options.exitCode ?? EXIT.USAGE
    this.cause = options.cause
  }

  static from(err: unknown, options: EnvyErrorOptions = {}): EnvyError {
    if (err instanceof EnvyError) return err

    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred'
    return new EnvyError(message, { cause: err, ...options })
  }
}
