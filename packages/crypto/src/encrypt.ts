import { importKey } from './key'
import type { EncryptedPayload } from './types'

export async function encrypt(
  plaintext: string,
  keyBase64: string,
  keyVersion: number = 1
): Promise<EncryptedPayload> {
  const key = await importKey(keyBase64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  const buffer = new Uint8Array(encrypted)
  const ciphertext = buffer.slice(0, buffer.length - 16)
  const tag = buffer.slice(buffer.length - 16)

  return {
    ciphertext: Buffer.from(ciphertext).toString('base64') as string,
    iv: Buffer.from(iv).toString('base64') as string,
    tag: Buffer.from(tag).toString('base64') as string,
    keyVersion
  }
}
