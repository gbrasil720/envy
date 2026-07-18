import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: join(__dirname, '../../apps/server/.env')
})

// IMPORTANT: `out` and `schema` must be relative to packages/db (cwd when
// running drizzle-kit). Absolute paths break generate: drizzle-kit reads
// snapshots as `./${path}`, so absolute paths become `.//Users/...` and ENOENT.
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://envy:envy@localhost:5432/envy'
  }
})
