import { afterEach, describe, expect, mock, test } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG_FILENAME } from '../constants'
import { createTempWorkspace, seedAuth } from '../test/helpers'
import type { InitUI } from './init'
import type { ProjectRow } from './projects'

const listQuery = mock(() =>
  Promise.resolve([
    {
      id: 'p1',
      name: 'Demo',
      slug: 'demo',
      secretsCount: 0,
      environments: [],
      lastSyncedAt: null,
      plan: 'free'
    }
  ] as ProjectRow[])
)

const createMutate = mock((input: { name: string }) =>
  Promise.resolve({
    id: 'p-new',
    name: input.name,
    slug: input.name.toLowerCase().replace(/\s+/g, '-')
  })
)

mock.module('../api', () => ({
  api: {
    projects: {
      list: { query: () => listQuery() },
      create: {
        mutate: (input: { name: string }) => createMutate(input)
      }
    }
  }
}))

const { runInit } = await import('./init')

function ui(overrides: Partial<InitUI> = {}): InitUI {
  return {
    confirmOverwrite: async () => true,
    promptProjectName: async () => 'New Project',
    selectProject: async (projects) => {
      const first = projects[0]
      if (!first) throw new Error('no projects')
      return first
    },
    selectEnvironment: async () => 'development',
    ...overrides
  }
}

describe('runInit', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    listQuery.mockClear()
    createMutate.mockClear()
    listQuery.mockImplementation(() =>
      Promise.resolve([
        {
          id: 'p1',
          name: 'Demo',
          slug: 'demo',
          secretsCount: 0,
          environments: [],
          lastSyncedAt: null,
          plan: 'free'
        }
      ])
    )
  })

  test('requires auth', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await expect(runInit({ cwd: ws.cwd }, ui())).rejects.toMatchObject({
      code: 'AUTH_REQUIRED'
    })
  })

  test('links existing project and writes config + gitignore note', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeFileSync(join(ws.cwd, '.gitignore'), 'node_modules\n')

    const result = await runInit({ cwd: ws.cwd }, ui())
    expect(result).toMatchObject({
      projectName: 'Demo',
      projectSlug: 'demo',
      environment: 'development',
      gitignoreNote: 'added'
    })

    const config = JSON.parse(
      readFileSync(join(ws.cwd, CONFIG_FILENAME), 'utf-8')
    ) as { project_id: string }
    expect(config.project_id).toBe('p1')
    expect(readFileSync(join(ws.cwd, '.gitignore'), 'utf-8')).toContain(
      CONFIG_FILENAME
    )
  })

  test('create flag creates project via API', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()

    const result = await runInit(
      { cwd: ws.cwd, create: true },
      ui({ promptProjectName: async () => 'Acme' })
    )
    expect(createMutate).toHaveBeenCalledWith({ name: 'Acme' })
    expect(result?.projectSlug).toBe('acme')
    expect(result?.projectName).toBe('Acme')
  })

  test('throws when no projects and not creating', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    listQuery.mockResolvedValueOnce([])

    await expect(runInit({ cwd: ws.cwd }, ui())).rejects.toMatchObject({
      code: 'NO_PROJECTS'
    })
  })

  test('returns null when overwrite declined', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    writeFileSync(
      join(ws.cwd, CONFIG_FILENAME),
      JSON.stringify({
        project_id: 'old',
        project_slug: 'old',
        environment: 'development'
      })
    )

    const result = await runInit(
      { cwd: ws.cwd },
      ui({ confirmOverwrite: async () => false })
    )
    expect(result).toBeNull()
    expect(listQuery).not.toHaveBeenCalled()
    expect(existsSync(join(ws.cwd, CONFIG_FILENAME))).toBe(true)
  })
})
