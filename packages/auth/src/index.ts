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

      schema: schema
    }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID as string,
        clientSecret: env.GITHUB_CLIENT_SECRET as string,
        redirectUri: `${env.BETTER_AUTH_URL}/api/auth/callback/github`
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
    advanced: {
      defaultCookieAttributes: {
        sameSite: 'none',
        secure: true,
        httpOnly: true,
        domain: '.useenvy.dev'
      }
    },
    plugins: [organization(), dash(), openAPI()]
  })
}

export const auth = createAuth()
