import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEnv } from '@t3-oss/env-core'
import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../apps/server/.env'
  )
})

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    SERVER_URL: z.string().url(),
    APP_URL: z.string().url(),
    SERVER_ENCRYPTION_KEY: z.string().min(44),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_API_KEY: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development')
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})
