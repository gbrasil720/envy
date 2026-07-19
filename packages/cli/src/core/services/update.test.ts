import { afterEach, describe, expect, mock, test } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTempWorkspace } from '../test/helpers'

// Mock fetch for npm registry
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('update service', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  test('fetchLatestVersion uses cache within one day', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    mkdirSync(ws.envyHome, { recursive: true })
    writeFileSync(
      join(ws.envyHome, 'update-check.json'),
      JSON.stringify({ lastChecked: Date.now(), latestVersion: '9.9.9' })
    )

    // If fetch is called, fail the test
    globalThis.fetch = mock(() => {
      throw new Error('fetch should not be called when cache is fresh')
    }) as unknown as typeof fetch

    const { fetchLatestVersion } = await import('./update')
    const version = await fetchLatestVersion()
    expect(version).toBe('9.9.9')
  })

  test('fetchLatestVersion hits registry when force=true', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup

    globalThis.fetch = mock(async () =>
      Response.json({ version: '3.0.0' })
    ) as unknown as typeof fetch

    // re-import won't re-run if cached — call with force
    const { fetchLatestVersion } = await import('./update')
    const version = await fetchLatestVersion({ force: true })
    expect(version).toBe('3.0.0')
  })

  test('checkUpdate reports updateAvailable via semver', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup

    globalThis.fetch = mock(async () =>
      Response.json({ version: '99.0.0' })
    ) as unknown as typeof fetch

    const { checkUpdate } = await import('./update')
    const check = await checkUpdate({ force: true })
    expect(check.latestVersion).toBe('99.0.0')
    expect(check.updateAvailable).toBe(true)
    expect(check.currentVersion).toBeTruthy()
  })

  test('runUpdate returns null when already latest', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup

    const { checkUpdate, runUpdate } = await import('./update')
    const current = (await checkUpdate({ force: true })).currentVersion

    globalThis.fetch = mock(async () =>
      Response.json({ version: current })
    ) as unknown as typeof fetch

    const events: string[] = []
    const result = await runUpdate(
      { yes: true, force: true },
      {
        onChecking: () => events.push('checking'),
        onAlreadyLatest: (v) => events.push(`latest:${v}`)
      }
    )
    expect(result).toBeNull()
    expect(events[0]).toBe('checking')
    expect(events.some((e) => e.startsWith('latest:'))).toBe(true)
  })
})
