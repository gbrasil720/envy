// packages/db/src/index.ts

import { env } from '@envy/env/server'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  not,
  or,
  sql
} from 'drizzle-orm'

export function createDb() {
  const client = postgres(env.DATABASE_URL)
  return drizzle(client, { schema })
}

export const db = createDb()
