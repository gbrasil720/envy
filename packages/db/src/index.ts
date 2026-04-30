// packages/db/src/index.ts
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@envy/env/server'

export {
  and, asc, count, desc, eq,
  inArray, isNotNull, isNull,
  ne, not, or, sql
} from 'drizzle-orm'

export function createDb() {
  const client = postgres(env.DATABASE_URL)
  return drizzle(client, { schema })
}

export const db = createDb()