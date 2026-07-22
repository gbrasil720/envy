import { hashToken } from '@envy/crypto'
import type { db as DbInstance } from '@envy/db'
import { eq } from '@envy/db'
import { apiKey } from '@envy/db/schema/envy'
import { TRPCError } from '@trpc/server'
import type { Context as ElysiaContext } from 'elysia'

export type CreateContextOptions = {
  context: ElysiaContext
}

export type Context = {
  db: typeof DbInstance
  authHeader: string | null
  cookieHeader: string | null
  session: { user: { id: string } } | null
  apiKeyId?: string | null
}

export type CreateTRPCContextInput = {
  headers: Headers
  db: typeof DbInstance
  resolveCookieSession: (
    headers: Headers
  ) => Promise<{ user: { id: string } } | null>
}

const API_KEY_EXPIRY_DAYS = 90

/**
 * Dual identity: Bearer API key (CLI) or cookie session (web).
 */
export async function createTRPCContext(
  input: CreateTRPCContextInput
): Promise<Context> {
  const authHeader = input.headers.get('authorization')
  const cookieHeader = input.headers.get('cookie')
  const { db } = input

  const bearerMatch = authHeader?.match(/^Bearer\s+([A-Za-z0-9_\-.]+)$/)
  if (bearerMatch) {
    const token = bearerMatch[1]
    if (token) {
      const key = await db.query.apiKey.findFirst({
        where: eq(apiKey.keyHash, await hashToken(token)),
        columns: {
          id: true,
          userId: true,
          revokedAt: true,
          expiresAt: true,
          lastUsedAt: true
        }
      })

      if (key && !key.revokedAt && key.expiresAt > new Date()) {
        // Throttle lastUsedAt updates: only write if >1h since last update
        const needsLastUsedUpdate =
          !key.lastUsedAt ||
          (key.lastUsedAt as Date).getTime() < Date.now() - 3600_000

        if (needsLastUsedUpdate) {
          await db
            .update(apiKey)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKey.id, key.id))
        }

        return {
          db,
          authHeader,
          cookieHeader,
          apiKeyId: key.id,
          session: {
            user: { id: key.userId }
          }
        }
      }

      // Expired or revoked key — reject
      if (key && key.expiresAt <= new Date()) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'API key has expired. Generate a new key.'
        })
      }
    }
  }

  if (cookieHeader) {
    const session = await input.resolveCookieSession(input.headers)
    if (session?.user) {
      return {
        db,
        authHeader,
        cookieHeader,
        apiKeyId: null,
        session: { user: { id: session.user.id } }
      }
    }
  }

  return {
    db,
    authHeader,
    cookieHeader,
    apiKeyId: null,
    session: null
  }
}

export function getApiKeyExpiryDate(): Date {
  return new Date(Date.now() + API_KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}
