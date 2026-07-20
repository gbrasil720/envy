import { describe, expect, test } from 'bun:test'
import { invalidateSecretScope } from './invalidateSecretScope'

describe('invalidateSecretScope', () => {
  function makeMockQueryClient() {
    const calls: string[][] = []
    return {
      invalidateQueries: (...args: unknown[]) => {
        calls.push(JSON.stringify(args))
      },
      calls
    } as unknown as { invalidateQueries: (...args: unknown[]) => void; calls: string[][] }
  }

  function makeMockTRPC() {
    return {
      secrets: {
        reveal: { queryOptions: (opts: unknown) => ({ queryKey: ['secrets:reveal', opts] }) },
        listKeys: { queryOptions: (opts: unknown) => ({ queryKey: ['secrets:listKeys', opts] }) }
      },
      auditLog: {
        list: { queryOptions: (opts: unknown) => ({ queryKey: ['auditLog:list', opts] }) }
      }
    } as unknown as Parameters<typeof invalidateSecretScope>[1]
  }

  test('invalidates reveal, listKeys, and auditLog when environment provided', () => {
    const qc = makeMockQueryClient()
    const trpc = makeMockTRPC()

    invalidateSecretScope(qc, trpc, 'proj-1', 'production')

    expect(qc.calls.length).toBe(3)
  })

  test('only invalidates auditLog when environment not provided', () => {
    const qc = makeMockQueryClient()
    const trpc = makeMockTRPC()

    invalidateSecretScope(qc, trpc, 'proj-1')

    expect(qc.calls.length).toBe(1)
  })
})