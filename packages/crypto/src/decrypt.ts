import { importKey } from './key'
import type { EncryptedPayload } from './types'

export async function decrypt(
  payload: EncryptedPayload,
  keyBase64: string
): Promise<string> {
  const key = await importKey(keyBase64)
  const iv = Buffer.from(payload.iv, 'base64')
  const ciphertext = Buffer.from(payload.ciphertext, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')

  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext)
  combined.set(tag, ciphertext.length)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    combined
  )

  return new TextDecoder().decode(decrypted)
}
