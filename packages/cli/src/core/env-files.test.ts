import { describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  collectMergesAndConflicts,
  isValidEnvFilename,
  maskSecret,
  parseEnvFile,
  scanEnvFiles
} from './env-files'

describe('parseEnvFile', () => {
  const dir = join(tmpdir(), `envy-test-${Date.now()}`)

  test('parses KEY=VALUE pairs', () => {
    mkdirSync(dir, { recursive: true })
    const path = join(dir, '.env')
    writeFileSync(
      path,
      ['# comment', 'FOO=bar', 'QUOTED="hello world"', "SINGLE='x'", ''].join(
        '\n'
      )
    )
    const parsed = parseEnvFile(path)
    expect(parsed.FOO).toBe('bar')
    expect(parsed.QUOTED).toBe('hello world')
    expect(parsed.SINGLE).toBe('x')
    rmSync(dir, { recursive: true, force: true })
  })

  test('unescapes quoted values', () => {
    mkdirSync(dir, { recursive: true })
    const path = join(dir, '.env')
    writeFileSync(path, 'A="line\\n dual"\n')
    const parsed = parseEnvFile(path)
    expect(parsed.A).toBe('line\n dual')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('scanEnvFiles', () => {
  test('finds .env* files only', () => {
    const dir = join(tmpdir(), `envy-scan-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '.env'), 'A=1')
    writeFileSync(join(dir, '.env.local'), 'B=2')
    writeFileSync(join(dir, 'readme.md'), 'nope')
    writeFileSync(join(dir, '.envrc'), 'nope')
    const files = scanEnvFiles(dir)
    expect(files).toEqual(['.env', '.env.local'])
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('collectMergesAndConflicts', () => {
  test('merges unique keys and detects conflicts', () => {
    const { merged, conflicts } = collectMergesAndConflicts([
      { file: '.env', secrets: { A: '1', B: 'x' } },
      { file: '.env.local', secrets: { B: 'y', C: '3' } }
    ])
    expect(merged.A).toBe('1')
    expect(merged.C).toBe('3')
    expect(merged.B).toBeUndefined()
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.key).toBe('B')
  })
})

describe('maskSecret', () => {
  test('masks values', () => {
    expect(maskSecret('')).toBe('(empty)')
    expect(maskSecret('abcdefghij')).toStartWith('abc')
    expect(maskSecret('abcdefghij')).toContain('•')
  })
})

describe('isValidEnvFilename', () => {
  test('accepts standard names', () => {
    expect(isValidEnvFilename('.env')).toBe(true)
    expect(isValidEnvFilename('.env.local')).toBe(true)
    expect(isValidEnvFilename('.env.production')).toBe(true)
    expect(isValidEnvFilename('env')).toBe(false)
    expect(isValidEnvFilename('../.env')).toBe(false)
  })
})
