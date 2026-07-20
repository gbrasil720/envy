import { describe, expect, test } from 'bun:test'
import { invalidateSecretScope } from './invalidateSecretScope'

describe('invalidateSecretScope', () => {
  function makeMockQueryClient() {
    const calls: unknown[][] = []
    return {
      invalidateQueries: (...args: unknown[]) => {
        calls.push(args)
      },
      calls
    } as any
  }

  test('invalidates reveal, listKeys, and auditLog when environment provided', () => {
    const qc = makeMockQueryClient()

    invalidateSecretScope(qc, 'proj-1', 'production')

    expect(qc.calls.length).toBe(3)
  })

  test('only invalidates auditLog when environment not provided', () => {
    const qc = makeMockQueryClient()

    invalidateSecretScope(qc, 'proj-1')

    expect(qc.calls.length).toBe(1)
  })
})