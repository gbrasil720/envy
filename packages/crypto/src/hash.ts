export async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return Buffer.from(hash).toString('hex')
}

export function generateApiToken(): string {
  const random = crypto.getRandomValues(new Uint8Array(32))
  const base = Buffer.from(random).toString('base64url')
  return `envy_live_${base}`
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 16) + '...'
}

export async function hashValue(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return Buffer.from(hash).toString('hex')
}
