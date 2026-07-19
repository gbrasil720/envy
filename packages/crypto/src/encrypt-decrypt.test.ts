import { describe, expect, test } from 'bun:test'
import { decrypt } from './decrypt'
import { encrypt } from './encrypt'
import { exportKey, generateKey } from './key'

async function freshKeyBase64(): Promise<string> {
  const key = await generateKey()
  return exportKey(key)
}

describe('encrypt / decrypt', () => {
  test('round-trips plaintext', async () => {
    const key = await freshKeyBase64()
    const payload = await encrypt('hello secret', key)
    const plain = await decrypt(payload, key)
    expect(plain).toBe('hello secret')
  })

  test('round-trips empty string and unicode', async () => {
    const key = await freshKeyBase64()
    for (const value of ['', '🔐 café', 'line1\nline2']) {
      const payload = await encrypt(value, key)
      expect(await decrypt(payload, key)).toBe(value)
    }
  })

  test('uses keyVersion default 1 and custom version', async () => {
    const key = await freshKeyBase64()
    const a = await encrypt('x', key)
    const b = await encrypt('x', key, 3)
    expect(a.keyVersion).toBe(1)
    expect(b.keyVersion).toBe(3)
  })

  test('produces distinct iv/ciphertext for same plaintext', async () => {
    const key = await freshKeyBase64()
    const a = await encrypt('same', key)
    const b = await encrypt('same', key)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(await decrypt(a, key)).toBe('same')
    expect(await decrypt(b, key)).toBe('same')
  })

  test('fails with wrong key', async () => {
    const keyA = await freshKeyBase64()
    const keyB = await freshKeyBase64()
    const payload = await encrypt('secret', keyA)
    await expect(decrypt(payload, keyB)).rejects.toBeDefined()
  })

  test('fails when tag is tampered', async () => {
    const key = await freshKeyBase64()
    const payload = await encrypt('secret', key)
    const tagBytes = Buffer.from(payload.tag, 'base64')
    tagBytes[0] = (tagBytes[0] ?? 0) ^ 0xff
    const tampered = {
      ...payload,
      tag: tagBytes.toString('base64')
    }
    await expect(decrypt(tampered, key)).rejects.toBeDefined()
  })

  test('fails when ciphertext is tampered', async () => {
    const key = await freshKeyBase64()
    const payload = await encrypt('secret', key)
    const ct = Buffer.from(payload.ciphertext, 'base64')
    if (ct.length === 0) {
      // empty plaintext → empty ciphertext; flip tag instead covered above
      return
    }
    ct[0] = (ct[0] ?? 0) ^ 0xff
    const tampered = {
      ...payload,
      ciphertext: ct.toString('base64')
    }
    await expect(decrypt(tampered, key)).rejects.toBeDefined()
  })

  test('payload fields are base64 strings', async () => {
    const key = await freshKeyBase64()
    const payload = await encrypt('data', key)
    const b64 = /^[A-Za-z0-9+/]+=*$/
    expect(payload.ciphertext).toMatch(b64)
    expect(payload.iv).toMatch(b64)
    expect(payload.tag).toMatch(b64)
    expect(Buffer.from(payload.iv, 'base64').length).toBe(12)
    expect(Buffer.from(payload.tag, 'base64').length).toBe(16)
  })
})
