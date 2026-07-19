import { afterEach, describe, expect, mock, test } from 'bun:test'
import { getAuth } from '../auth'
import { createTempWorkspace, seedAuth } from '../test/helpers'

const logoutMutate = mock(() => Promise.resolve({ success: true }))

mock.module('../api', () => ({
  api: {
    auth: {
      logout: {
        mutate: () => logoutMutate()
      }
    }
  }
}))

const { runLogout } = await import('./logout')

describe('runLogout', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    logoutMutate.mockClear()
  })

  test('requires auth', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await expect(runLogout()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  test('calls api logout and clears credentials', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    expect(getAuth()).not.toBeNull()

    const events: string[] = []
    await runLogout({
      onStart: () => events.push('start'),
      onDone: () => events.push('done')
    })

    expect(logoutMutate).toHaveBeenCalledTimes(1)
    expect(getAuth()).toBeNull()
    expect(events).toEqual(['start', 'done'])
  })
})
