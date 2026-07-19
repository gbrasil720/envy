import { afterEach, describe, expect, mock, test } from 'bun:test'
import { getAuth } from '../auth'
import { createTempWorkspace } from '../test/helpers'

const startMutate = mock(() =>
  Promise.resolve({
    session_token: '11111111-1111-1111-1111-111111111111',
    url: 'http://localhost:3001/cli-auth?session=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    expires_at: new Date().toISOString()
  })
)

const pollQuery = mock(() =>
  Promise.resolve({
    status: 'authorized' as const,
    api_key: 'envy_live_testkey'
  })
)

const meQuery = mock(() =>
  Promise.resolve({ name: 'Gui', email: 'gui@test.local' })
)

mock.module('../api', () => ({
  api: {
    cliAuth: {
      start: { mutate: () => startMutate() },
      poll: { query: () => pollQuery() }
    },
    me: {
      get: { query: () => meQuery() }
    }
  }
}))

// Speed up poll loop (constants are read at module load of login → set before import)
process.env.ENVY_POLL_INTERVAL_MS = '1'
process.env.ENVY_POLL_TIMEOUT_MS = '2000'

const { openBrowser, runLogin } = await import('./login')

describe('runLogin', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    startMutate.mockClear()
    pollQuery.mockClear()
    meQuery.mockClear()
    pollQuery.mockImplementation(() =>
      Promise.resolve({
        status: 'authorized' as const,
        api_key: 'envy_live_testkey'
      })
    )
  })

  test('polls until authorized, saves auth, returns profile', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup

    const events: string[] = []
    const result = await runLogin({
      onStart: (url) => events.push(`start:${url}`),
      onWaiting: () => events.push('waiting'),
      onDone: () => events.push('done')
    })

    expect(result).toEqual({ name: 'Gui', email: 'gui@test.local' })
    expect(startMutate).toHaveBeenCalled()
    expect(pollQuery).toHaveBeenCalled()
    expect(meQuery).toHaveBeenCalled()
    expect(events.some((e) => e.startsWith('start:'))).toBe(true)
    expect(events).toContain('waiting')
    expect(events).toContain('done')

    const auth = getAuth()
    expect(auth?.token).toBe('envy_live_testkey')
    expect(auth?.user).toBe('Gui')
  })

  test('throws AUTH_CANCELLED when poll returns cancelled', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    pollQuery.mockResolvedValue({ status: 'cancelled' } as never)

    await expect(runLogin()).rejects.toMatchObject({ code: 'AUTH_CANCELLED' })
  })
})

describe('openBrowser', () => {
  test('rejects non-http schemes', () => {
    const result = openBrowser('file:///etc/passwd')
    expect(result.opened).toBe(false)
    expect(result.warn).toContain('scheme')
  })

  test('accepts http urls without throwing', () => {
    // may or may not open depending on platform; should not throw
    const result = openBrowser('http://localhost:3001/cli-auth')
    expect(typeof result.opened).toBe('boolean')
  })
})
