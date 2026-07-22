export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt'
  ])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return Buffer.from(raw).toString('base64')
}

export async function importKey(base64: string): Promise<CryptoKey> {
  let raw: Uint8Array
  if (/^[0-9a-fA-F]{64}$/.test(base64)) {
    raw = new Uint8Array(
      Array.from({ length: 32 }, (_, i) =>
        parseInt(base64.slice(i * 2, i * 2 + 2), 16)
      )
    )
  } else {
    raw = Buffer.from(base64, 'base64')
  }
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
