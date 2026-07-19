import { describe, expect, test } from 'bun:test'
import {
  generateApiToken,
  hashToken,
  hashValue,
  hmacValue,
  tokenPrefix
} from './hash'
import { exportKey, generateKey } from './key'

describe('hashToken / hashValue', () => {
  test('hashToken is deterministic SHA-256 hex', async () => {
    const a = await hashToken('envy_live_abc')
    const b = await hashToken('envy_live_abc')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  test('hashToken differs for different inputs', async () => {
    const a = await hashToken('token-a')
    const b = await hashToken('token-b')
    expect(a).not.toBe(b)
  })

  test('hashValue matches hashToken for same input', async () => {
    const value = 'same-input'
    expect(await hashValue(value)).toBe(await hashToken(value))
  })
})

describe('generateApiToken / tokenPrefix', () => {
  test('generateApiToken has envy_live_ prefix', () => {
    const token = generateApiToken()
    expect(token.startsWith('envy_live_')).toBe(true)
    expect(token.length).toBeGreaterThan('envy_live_'.length + 10)
  })

  test('generateApiToken produces unique values', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateApiToken()))
    expect(tokens.size).toBe(20)
  })

  test('tokenPrefix is first 16 chars plus ellipsis', () => {
    const token = 'envy_live_ABCDEFGHIJKLMNOP'
    expect(tokenPrefix(token)).toBe(`${token.slice(0, 16)}...`)
  })
})

describe('hmacValue', () => {
  test('is stable for same value and key', async () => {
    const key = await exportKey(await generateKey())
    const a = await hmacValue('DATABASE_URL=postgres://x', key)
    const b = await hmacValue('DATABASE_URL=postgres://x', key)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  test('changes when value changes', async () => {
    const key = await exportKey(await generateKey())
    const a = await hmacValue('v1', key)
    const b = await hmacValue('v2', key)
    expect(a).not.toBe(b)
  })

  test('changes when key changes', async () => {
    const keyA = await exportKey(await generateKey())
    const keyB = await exportKey(await generateKey())
    const a = await hmacValue('same', keyA)
    const b = await hmacValue('same', keyB)
    expect(a).not.toBe(b)
  })
})
