import { env } from '@envy/env/server'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

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
  ne,
  not,
  or,
  sql
} from 'drizzle-orm'

export function createDb() {
  const sql = neon(env.DATABASE_URL)
  return drizzle(sql, { schema })
}

export const db = createDb()
