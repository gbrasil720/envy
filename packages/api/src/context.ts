import type { db } from '@envy/db'
import type { Context as ElysiaContext } from 'elysia'

export type CreateContextOptions = {
  context: ElysiaContext
}

export type Context = {
  db: typeof db
  authHeader: string | null
  cookieHeader: string | null
  session: { user: { id: string } } | null
  apiKeyId?: string | null
}
