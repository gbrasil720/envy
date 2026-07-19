import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import { createTempWorkspace, seedAuth } from '../test/helpers'

const meQuery = mock(() =>
  Promise.resolve({ name: 'Gui', email: 'gui@test.local' })
)

mock.module('../api', () => ({
  api: {
    me: {
      get: {
        query: () => meQuery()
      }
    }
  }
}))

const { runWhoami } = await import('./whoami')

describe('runWhoami', () => {
  let cleanup: (() => void) | undefined

  beforeAll(() => {
    meQuery.mockClear()
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    meQuery.mockClear()
  })

  test('requires auth', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await expect(runWhoami()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED'
    })
  })

  test('returns user profile and CLI version', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()

    const result = await runWhoami()
    expect(result.name).toBe('Gui')
    expect(result.email).toBe('gui@test.local')
    expect(result.version).toMatch(/^v\d+\.\d+\.\d+/)
    expect(meQuery).toHaveBeenCalledTimes(1)
  })

  test('falls back name dash when null', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    meQuery.mockResolvedValueOnce({
      name: null as unknown as string,
      email: 'x@test.local'
    })

    const result = await runWhoami()
    expect(result.name).toBe('—')
    expect(result.email).toBe('x@test.local')
  })
})
