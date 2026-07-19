import { describe, expect, test } from 'bun:test'
import { describeError, EnvyError, EXIT } from './errors'

describe('EnvyError', () => {
  test('sets defaults', () => {
    const err = new EnvyError('boom')
    expect(err.name).toBe('EnvyError')
    expect(err.message).toBe('boom')
    expect(err.suggestion).toBe('')
    expect(err.code).toBe('UNKNOWN')
    expect(err.exitCode).toBe(EXIT.USAGE)
  })

  test('accepts options', () => {
    const err = new EnvyError('nope', {
      suggestion: 'try again',
      code: 'AUTH_REQUIRED',
      exitCode: EXIT.AUTH
    })
    expect(err.suggestion).toBe('try again')
    expect(err.code).toBe('AUTH_REQUIRED')
    expect(err.exitCode).toBe(EXIT.AUTH)
  })

  test('from returns same EnvyError instance', () => {
    const original = new EnvyError('x', { code: 'KEEP' })
    const again = EnvyError.from(original, { code: 'OTHER' })
    expect(again).toBe(original)
    expect(again.code).toBe('KEEP')
  })

  test('from wraps Error and unknown', () => {
    const fromError = EnvyError.from(new Error('network'), {
      code: 'NET',
      exitCode: EXIT.NETWORK
    })
    expect(fromError.message).toBe('network')
    expect(fromError.code).toBe('NET')
    expect(fromError.exitCode).toBe(EXIT.NETWORK)

    const fromUnknown = EnvyError.from(42)
    expect(fromUnknown.message).toBe('An unexpected error occurred')
  })
})

describe('describeError', () => {
  test('non-Error becomes generic message', () => {
    expect(describeError('x')).toEqual({
      message: 'An unexpected error occurred'
    })
  })

  test('plain Error returns its message', () => {
    expect(describeError(new Error('something broke'))).toEqual({
      message: 'something broke'
    })
  })

  test('maps fetch failed network codes to suggestions', () => {
    const make = (code: string) => {
      const err = new Error('fetch failed') as Error & {
        cause: { code: string; message: string }
      }
      err.cause = { code, message: 'detail' }
      return err
    }

    expect(describeError(make('ENOTFOUND')).suggestion).toContain('DNS')
    expect(describeError(make('ECONNREFUSED')).suggestion).toContain(
      'Connection refused'
    )
    expect(describeError(make('ETIMEDOUT')).suggestion).toContain('timed out')
    expect(describeError(make('CERT_HAS_EXPIRED')).suggestion).toContain('TLS')
    expect(describeError(make('UNKNOWN_CODE')).suggestion).toContain(
      'ENVY_DEBUG'
    )
  })
})
