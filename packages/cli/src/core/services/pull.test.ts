import { afterEach, describe, expect, mock, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createTempWorkspace,
  seedAuth,
  writeEnv,
  writeProjectConfig
} from '../test/helpers'
import type { PullUI } from './pull'

const revealQuery = mock((_input: { projectId: string; environment: string }) =>
  Promise.resolve({ secrets: { FOO: 'remote', BAR: '2' } })
)

mock.module('../api', () => ({
  api: {
    secrets: {
      reveal: {
        query: (input: { projectId: string; environment: string }) =>
          revealQuery(input)
      }
    }
  }
}))

const { runPull } = await import('./pull')

function ui(overrides: Partial<PullUI> = {}): PullUI {
  return {
    promptNewFilename: async () => '.env.local',
    selectTarget: async (files) => files[0] ?? '.env.local',
    confirmKeepLocal: async () => true,
    confirmOverwrite: async () => true,
    ...overrides
  }
}

describe('runPull', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    revealQuery.mockClear()
    revealQuery.mockImplementation(() =>
      Promise.resolve({ secrets: { FOO: 'remote', BAR: '2' } })
    )
  })

  test('requires auth', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    writeProjectConfig(ws.cwd)
    await expect(runPull({ cwd: ws.cwd }, ui())).rejects.toMatchObject({
      code: 'AUTH_REQUIRED'
    })
  })

  test('writes secrets with --yes and output file', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd, { project_id: 'p1', environment: 'staging' })

    const summary = await runPull(
      { cwd: ws.cwd, yes: true, output: '.env.local', env: 'staging' },
      ui()
    )

    expect(summary).toMatchObject({
      projectSlug: 'demo',
      environment: 'staging',
      secretsCount: 2,
      file: '.env.local'
    })
    expect(revealQuery).toHaveBeenCalledWith({
      projectId: 'p1',
      environment: 'staging'
    })

    const content = readFileSync(join(ws.cwd, '.env.local'), 'utf-8')
    expect(content).toContain('FOO="remote"')
    expect(content).toContain('BAR="2"')
  })

  test('returns null and calls onEmpty when remote has no secrets', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    revealQuery.mockResolvedValueOnce({ secrets: {} })

    const empty: string[] = []
    const result = await runPull(
      { cwd: ws.cwd, yes: true, output: '.env' },
      ui({ onEmpty: (env) => empty.push(env) })
    )
    expect(result).toBeNull()
    expect(empty).toEqual(['development'])
    expect(existsSync(join(ws.cwd, '.env'))).toBe(false)
  })

  test('merges local-only keys when confirmed', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    writeEnv(ws.cwd, '.env.local', { FOO: 'old', LOCAL: 'keep' })

    await runPull(
      { cwd: ws.cwd, yes: true, output: '.env.local' },
      ui({ confirmKeepLocal: async () => true })
    )

    const content = readFileSync(join(ws.cwd, '.env.local'), 'utf-8')
    expect(content).toContain('LOCAL="keep"')
    expect(content).toContain('FOO="remote"')
  })

  test('aborts overwrite when user declines', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    // local has same keys as remote → overwrite confirm path
    writeEnv(ws.cwd, '.env.local', { FOO: 'old', BAR: 'old' })

    const aborts: string[] = []
    const result = await runPull(
      { cwd: ws.cwd, output: '.env.local' },
      ui({
        confirmOverwrite: async () => false,
        onAbort: (r) => aborts.push(r)
      })
    )
    expect(result).toBeNull()
    expect(aborts).toEqual(['Aborted.'])
    expect(readFileSync(join(ws.cwd, '.env.local'), 'utf-8')).toContain(
      'FOO=old'
    )
  })

  test('rejects invalid output filename', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)

    await expect(
      runPull({ cwd: ws.cwd, yes: true, output: 'not-env' }, ui())
    ).rejects.toMatchObject({ code: 'INVALID_PATH' })
  })

  test('prompts for new filename when no env files exist', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)

    const summary = await runPull(
      { cwd: ws.cwd },
      ui({ promptNewFilename: async () => '.env.production' })
    )
    expect(summary?.file).toBe('.env.production')
    expect(existsSync(join(ws.cwd, '.env.production'))).toBe(true)
  })
})
