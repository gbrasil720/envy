import { createEnv } from '@t3-oss/env-core'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: '.env' })
config({ path: '.env.local', override: true })

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
    GITHUB_CLIENT_ID: z.string().transform((s) => s.trim()),
    GITHUB_CLIENT_SECRET: z.string().transform((s) => s.trim()),
    GITHUB_CLIENT_ID_DEV: z.string().transform((s) => s.trim()),
    GITHUB_CLIENT_SECRET_DEV: z.string().transform((s) => s.trim()),
    TRUSTED_ORIGINS: z.string().optional(),
    DODO_PAYMENTS_API_KEY: z.string().min(1),
    DODO_PAYMENTS_WEBHOOK_SECRET: z.string().min(1),
    DODO_PAYMENTS_ENVIRONMENT: z.enum(['test_mode', 'live_mode']),
    DODO_PRO_PRODUCT_ID: z.string().min(1),
    DODO_TEAM_PRODUCT_ID: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    EMAIL_FROM_ALERTS: z.string().min(1),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development')
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})
