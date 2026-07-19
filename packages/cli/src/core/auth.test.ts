import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, statSync } from 'node:fs'
import {
  clearAuth,
  getAuth,
  getCredentialsPath,
  requireAuth,
  saveAuth
} from './auth'
import { EnvyError } from './errors'
import { createTempWorkspace } from './test/helpers'

describe('auth credentials', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  test('getAuth returns null when missing', () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    expect(getAuth()).toBeNull()
    expect(() => requireAuth()).toThrow(EnvyError)
    try {
      requireAuth()
    } catch (err) {
      expect(err).toMatchObject({ code: 'AUTH_REQUIRED' })
    }
  })

  test('saveAuth / getAuth / clearAuth round-trip', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup

    await saveAuth({
      token: 'envy_live_abc',
      user: 'gui',
      api_url: 'https://api.useenvy.dev'
    })

    const path = getCredentialsPath()
    expect(existsSync(path)).toBe(true)
    expect(path.startsWith(ws.envyHome)).toBe(true)

    // mode 0o600 on platforms that honor it
    const mode = statSync(path).mode & 0o777
    expect(mode).toBe(0o600)

    const auth = getAuth()
    expect(auth?.token).toBe('envy_live_abc')
    expect(auth?.user).toBe('gui')
    expect(auth?.created_at).toBeTruthy()

    const raw = JSON.parse(readFileSync(path, 'utf-8')) as { token: string }
    expect(raw.token).toBe('envy_live_abc')

    clearAuth()
    expect(getAuth()).toBeNull()
    expect(existsSync(path)).toBe(false)
  })

  test('getAuth returns null for corrupt JSON', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    const { writeFileSync, mkdirSync } = await import('node:fs')
    mkdirSync(ws.envyHome, { recursive: true })
    writeFileSync(getCredentialsPath(), '{not-json', 'utf-8')
    expect(getAuth()).toBeNull()
  })
})
