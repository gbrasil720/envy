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
