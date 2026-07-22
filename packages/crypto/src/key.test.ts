import { describe, expect, test } from 'bun:test'
import { decrypt } from './decrypt'
import { encrypt } from './encrypt'
import { exportKey, generateKey, importKey } from './key'

describe('generateKey / exportKey / importKey', () => {
  test('export/import round-trips for encrypt/decrypt', async () => {
    const key = await generateKey()
    const base64 = await exportKey(key)
    expect(typeof base64).toBe('string')
    expect(Buffer.from(base64, 'base64').length).toBe(32)

    const imported = await importKey(base64)
    // re-export not possible (import uses extractable: false) — use via encrypt
    const payload = await encrypt('via-imported', base64)
    expect(await decrypt(payload, base64)).toBe('via-imported')
    expect(imported.type).toBe('secret')
    expect(imported.algorithm).toMatchObject({ name: 'AES-GCM' })
  })

  test('generateKey produces distinct keys', async () => {
    const a = await exportKey(await generateKey())
    const b = await exportKey(await generateKey())
    expect(a).not.toBe(b)
  })

  test('importKey accepts hex-encoded keys', async () => {
    const key = await generateKey()
    const base64 = await exportKey(key)
    const raw = Buffer.from(base64, 'base64')
    const hex = raw.toString('hex')
    expect(hex.length).toBe(64)

    const imported = await importKey(hex)
    const payload = await encrypt('via-hex', hex)
    expect(await decrypt(payload, hex)).toBe('via-hex')
    expect(imported.type).toBe('secret')
    expect(imported.algorithm).toMatchObject({ name: 'AES-GCM' })
  })
})
