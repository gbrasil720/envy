import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfig, requireConfig, saveConfig } from './config'
import { CONFIG_FILENAME } from './constants'
import { EnvyError } from './errors'
import { createTempWorkspace } from './test/helpers'

describe('config', () => {
  let cleanup: (() => void) | undefined
  let prevCwd: string

  afterEach(() => {
    if (prevCwd) process.chdir(prevCwd)
    cleanup?.()
    cleanup = undefined
  })

  test('getConfig/requireConfig when missing', () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    prevCwd = process.cwd()
    process.chdir(ws.cwd)

    expect(getConfig()).toBeNull()
    expect(() => requireConfig()).toThrow(EnvyError)
    try {
      requireConfig()
    } catch (err) {
      expect(err).toMatchObject({ code: 'CONFIG_REQUIRED' })
    }
  })

  test('saveConfig writes file and gitignore entry', () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    prevCwd = process.cwd()
    process.chdir(ws.cwd)

    writeFileSync(join(ws.cwd, '.gitignore'), 'node_modules\n')

    saveConfig(
      {
        project_id: 'p1',
        project_slug: 'demo',
        environment: 'development'
      },
      ws.cwd
    )

    const configPath = join(ws.cwd, CONFIG_FILENAME)
    expect(existsSync(configPath)).toBe(true)
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      project_slug: string
    }
    expect(parsed.project_slug).toBe('demo')

    const gi = readFileSync(join(ws.cwd, '.gitignore'), 'utf-8')
    expect(gi).toContain(CONFIG_FILENAME)

    expect(getConfig()).toEqual({
      project_id: 'p1',
      project_slug: 'demo',
      environment: 'development'
    })
  })

  test('getConfig walks parents up to depth limit', () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    prevCwd = process.cwd()

    writeFileSync(
      join(ws.cwd, CONFIG_FILENAME),
      JSON.stringify({
        project_id: 'p1',
        project_slug: 'root',
        environment: 'development'
      })
    )

    const nested = join(ws.cwd, 'a', 'b')
    mkdirSync(nested, { recursive: true })
    process.chdir(nested)

    expect(getConfig()?.project_slug).toBe('root')
  })

  test('getConfig rejects invalid schema', () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    prevCwd = process.cwd()
    process.chdir(ws.cwd)

    writeFileSync(
      join(ws.cwd, CONFIG_FILENAME),
      JSON.stringify({ project_id: 'p1' })
    )
    expect(getConfig()).toBeNull()
  })
})
