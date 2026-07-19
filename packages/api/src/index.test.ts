import { describe, expect, test } from 'bun:test'
import { TRPCError } from '@trpc/server'
import type { Context } from './context'
import { createCallerWithContext } from './test/caller'

function baseCtx(overrides: Partial<Context> = {}): Context {
  return {
    db: {} as Context['db'],
    authHeader: null,
    cookieHeader: null,
    session: null,
    apiKeyId: null,
    ...overrides
  }
}

describe('protectedProcedure', () => {
  test('rejects unauthenticated callers', async () => {
    const caller = createCallerWithContext(baseCtx({ session: null }))
    try {
      // me.get is a protected query with no input
      await caller.me.get()
      expect.unreachable('expected UNAUTHORIZED')
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError)
      expect((err as TRPCError).code).toBe('UNAUTHORIZED')
    }
  })

  test('allows public procedures without session', async () => {
    const caller = createCallerWithContext(baseCtx({ session: null }))
    // healthCheck does not touch db
    const result = await caller.healthCheck()
    expect(result).toBe('OK')
  })
})
