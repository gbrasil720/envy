import { dash } from '@better-auth/infra'
import { createDb } from '@envy/db'
import * as schema from '@envy/db/schema/auth'
import { env } from '@envy/env/server'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { openAPI, organization } from 'better-auth/plugins'

export function createAuth() {
  const db = createDb()

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema
    }),
    socialProviders: {
      github: {
        clientId:
          env.NODE_ENV === 'development'
            ? (env.GITHUB_CLIENT_ID_DEV as string).trim()
            : (env.GITHUB_CLIENT_ID as string).trim(),
        clientSecret:
          env.NODE_ENV === 'development'
            ? (env.GITHUB_CLIENT_SECRET_DEV as string).trim()
            : (env.GITHUB_CLIENT_SECRET as string).trim()
      }
    },
    trustedOrigins: [
      env.CORS_ORIGIN,
      env.BETTER_AUTH_URL,
      ...(env.TRUSTED_ORIGINS?.split(',') ?? [])
    ],
    emailAndPassword: {
      enabled: true
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    account: {
      storeStateStrategy: 'cookie'
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: env.NODE_ENV === 'development' ? 'lax' : 'none',
        secure: env.NODE_ENV !== 'development',
        httpOnly: true,
        domain: env.NODE_ENV === 'development' ? undefined : '.useenvy.dev'
      }
    },
    plugins: [organization(), dash(), openAPI()]
  })
}

export const auth = createAuth()
