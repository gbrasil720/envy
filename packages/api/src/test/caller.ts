import { session } from '@envy/db/schema/auth'
import { makeSignature } from 'better-auth/crypto'
import type { Context } from '../context'
import { appRouter } from '../routers'
import { getTestDb } from './db'

/**
 * tRPC caller against the real app router and shared test DB.
 * Pass `userId` for an authenticated session; omit for anonymous.
 */
export function createCaller(userId?: string | null) {
  const ctx: Context = {
    db: getTestDb(),
    authHeader: null,
    cookieHeader: null,
    session: userId ? { user: { id: userId } } : null,
    apiKeyId: null
  }
  return appRouter.createCaller(ctx)
}

export function createCallerWithContext(ctx: Context) {
  return appRouter.createCaller(ctx)
}

/**
 * Caller with a real Better Auth database session and signed session cookie.
 * Use this for services that delegate back through auth.api.*.
 */
export async function createAuthenticatedCaller(userId: string) {
  const token = crypto.randomUUID()
  const now = new Date()
  await getTestDb()
    .insert(session)
    .values({
      id: crypto.randomUUID(),
      token,
      userId,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now
    })

  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required for auth tests')
  const signature = await makeSignature(token, secret)
  const cookieHeader = `better-auth.session_token=${token}.${signature}`

  const ctx: Context = {
    db: getTestDb(),
    authHeader: null,
    cookieHeader,
    session: { user: { id: userId } },
    apiKeyId: null
  }
  return appRouter.createCaller(ctx)
}
