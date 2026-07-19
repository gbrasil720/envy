import { afterEach, describe, expect, mock, test } from 'bun:test'
import { createTempWorkspace, seedAuth } from '../test/helpers'

const listQuery = mock(() =>
  Promise.resolve([
    {
      id: 'p1',
      name: 'A',
      slug: 'a',
      secretsCount: 2,
      environments: [{ name: 'development' }],
      lastSyncedAt: null,
      plan: 'free'
    }
  ])
)

const createMutate = mock((input: { name: string }) =>
  Promise.resolve({ id: 'n1', name: input.name, slug: 'new-app' })
)

mock.module('../api', () => ({
  api: {
    projects: {
      list: { query: () => listQuery() },
      create: { mutate: (input: { name: string }) => createMutate(input) }
    }
  }
}))

const { createProject, listProjects } = await import('./projects')

describe('projects service', () => {
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
          name: 'A',
          slug: 'a',
          secretsCount: 2,
          environments: [{ name: 'development' }],
          lastSyncedAt: null,
          plan: 'free'
        }
      ])
    )
  })

  test('listProjects requires auth and returns rows', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await expect(listProjects()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED'
    })

    await seedAuth()
    const events: string[] = []
    const rows = await listProjects({
      onFetching: () => events.push('fetch'),
      onDone: () => events.push('done')
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.slug).toBe('a')
    expect(events).toEqual(['fetch', 'done'])
  })

  test('listProjects wraps API errors', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    listQuery.mockRejectedValueOnce(new Error('network'))

    await expect(listProjects()).rejects.toMatchObject({
      code: 'PROJECTS_FETCH_FAILED'
    })
  })

  test('createProject trims name and returns created', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()

    const created = await createProject('  New App  ')
    expect(createMutate).toHaveBeenCalledWith({ name: 'New App' })
    expect(created.slug).toBe('new-app')
  })

  test('createProject wraps API errors', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await seedAuth()
    createMutate.mockRejectedValueOnce(new Error('limit'))

    await expect(createProject('X')).rejects.toMatchObject({
      code: 'PROJECT_CREATE_FAILED'
    })
  })
})
