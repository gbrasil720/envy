import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  createTempWorkspace,
  seedAuth,
  writeEnv,
  writeProjectConfig
} from '../test/helpers'
import type { PushUI } from './push'

const diffMutate = mock(
  (_input: unknown) =>
    Promise.resolve({
      added: ['NEW'],
      changed: ['CHANGED'],
      unchanged: ['SAME']
    }) as Promise<{
      added: string[]
      changed: string[]
      unchanged: string[]
    }>
)

const pushMutate = mock((_input: unknown) => Promise.resolve({ upserted: 2 }))

mock.module('../api', () => ({
  api: {
    secrets: {
      diff: {
        mutate: (input: unknown) => diffMutate(input)
      },
      push: {
        mutate: (input: unknown) => pushMutate(input)
      }
    }
  }
}))

const { runPush } = await import('./push')

function ui(overrides: Partial<PushUI> = {}): PushUI {
  return {
    selectFiles: async (files) => files,
    resolveConflict: async (c) => c.values[0] ?? '',
    confirm: async () => true,
    ...overrides
  }
}

describe('runPush', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    diffMutate.mockClear()
    pushMutate.mockClear()
    diffMutate.mockImplementation(() =>
      Promise.resolve({
        added: ['NEW'],
        changed: ['CHANGED'],
        unchanged: ['SAME']
      })
    )
    pushMutate.mockImplementation(() => Promise.resolve({ upserted: 2 }))
  })

  test('requires auth', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    writeProjectConfig(ws.cwd)
    writeEnv(ws.cwd, '.env', { A: '1' })
    await expect(runPush({ cwd: ws.cwd }, ui())).rejects.toMatchObject({
      code: 'AUTH_REQUIRED'
    })
  })

  test('throws when no env files', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    await expect(
      runPush({ cwd: ws.cwd, yes: true }, ui())
    ).rejects.toMatchObject({
      code: 'NO_ENV_FILES'
    })
  })

  test('pushes added and changed keys with --yes', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd, { project_id: 'p1', environment: 'production' })
    writeEnv(ws.cwd, '.env', {
      NEW: '1',
      CHANGED: '2',
      SAME: '3'
    })

    const summary = await runPush(
      { cwd: ws.cwd, yes: true, env: 'production' },
      ui()
    )

    expect(summary).toMatchObject({
      projectSlug: 'demo',
      environment: 'production',
      upserted: 2,
      files: ['.env']
    })

    expect(diffMutate).toHaveBeenCalledWith({
      projectId: 'p1',
      environment: 'production',
      secrets: { NEW: '1', CHANGED: '2', SAME: '3' }
    })
    expect(pushMutate).toHaveBeenCalledWith({
      projectId: 'p1',
      environment: 'production',
      secrets: { NEW: '1', CHANGED: '2' }
    })
  })

  test('returns null when remote is up to date', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    writeEnv(ws.cwd, '.env', { A: '1' })
    diffMutate.mockResolvedValueOnce({
      added: [],
      changed: [],
      unchanged: ['A']
    })

    const upToDate: boolean[] = []
    const result = await runPush(
      { cwd: ws.cwd, yes: true },
      ui({ onUpToDate: () => upToDate.push(true) })
    )
    expect(result).toBeNull()
    expect(upToDate).toEqual([true])
    expect(pushMutate).not.toHaveBeenCalled()
  })

  test('aborts when user declines confirm', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    writeEnv(ws.cwd, '.env', { A: '1' })

    const aborts: string[] = []
    const result = await runPush(
      { cwd: ws.cwd },
      ui({
        confirm: async () => false,
        onAbort: (r) => aborts.push(r)
      })
    )
    expect(result).toBeNull()
    expect(aborts).toEqual(['Aborted.'])
    expect(pushMutate).not.toHaveBeenCalled()
  })

  test('resolves conflicts across files', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    writeEnv(ws.cwd, '.env', { SHARED: 'from-env', ONLY_A: '1' })
    writeEnv(ws.cwd, '.env.local', { SHARED: 'from-local', ONLY_B: '2' })

    const conflicts: string[] = []
    await runPush(
      { cwd: ws.cwd, yes: true },
      ui({
        selectFiles: async (files) => files,
        resolveConflict: async (c) => {
          conflicts.push(c.key)
          return 'picked'
        }
      })
    )

    expect(conflicts).toEqual(['SHARED'])
    const diffArg = diffMutate.mock.calls[0]?.[0] as {
      secrets: Record<string, string>
    }
    expect(diffArg.secrets.SHARED).toBe('picked')
    expect(diffArg.secrets.ONLY_A).toBe('1')
    expect(diffArg.secrets.ONLY_B).toBe('2')
  })

  test('throws when selected files have no secrets', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeProjectConfig(ws.cwd)
    writeEnv(ws.cwd, '.env', '# only comments\n')

    await expect(
      runPush({ cwd: ws.cwd, yes: true }, ui())
    ).rejects.toMatchObject({ code: 'NO_SECRETS' })
  })
})
