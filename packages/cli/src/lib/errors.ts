export const EXIT = {
  OK: 0,
  USAGE: 1,
  AUTH: 2,
  NETWORK: 3,
  PERMISSION: 4,
  SOFTWARE: 5
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

export type DescribedError = {
  message: string
  suggestion?: string
}

export function describeError(err: unknown): DescribedError {
  if (!(err instanceof Error)) {
    return { message: 'An unexpected error occurred' }
  }

  if (err.message !== 'fetch failed') {
    return { message: err.message }
  }

  const cause = (err as { cause?: unknown }).cause
  const causeCode =
    cause && typeof cause === 'object' && 'code' in cause
      ? String((cause as { code: unknown }).code)
      : undefined
  const causeMessage =
    cause instanceof Error
      ? cause.message
      : cause && typeof cause === 'object' && 'message' in cause
        ? String((cause as { message: unknown }).message)
        : undefined

  const detail = causeMessage
    ? `fetch failed — ${causeMessage}`
    : 'fetch failed'

  switch (causeCode) {
    case 'ENOTFOUND':
      return {
        message: detail,
        suggestion: 'DNS lookup failed. Check the API URL and your connection.'
      }
    case 'ECONNREFUSED':
      return {
        message: detail,
        suggestion:
          'Connection refused. Is the server running and reachable at the configured API URL?'
      }
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
      return {
        message: detail,
        suggestion: 'Connection timed out. Check your network or VPN/proxy.'
      }
    case 'CERT_HAS_EXPIRED':
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
      return {
        message: detail,
        suggestion:
          'TLS certificate problem. Verify the API URL uses HTTPS and the cert is valid.'
      }
    default:
      return {
        message: detail,
        suggestion:
          'Network request failed. Run with ENVY_DEBUG=1 for a full stack trace.'
      }
  }
}
