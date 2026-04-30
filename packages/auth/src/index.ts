import { dash } from '@better-auth/infra'
import { and, createDb, eq } from '@envy/db'
import * as schema from '@envy/db/schema/auth'
import * as envySchema from '@envy/db/schema/envy'
import { env } from '@envy/env/server'
import { APIError, betterAuth } from 'better-auth'
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
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const dbUser = await db.query.user.findFirst({
              where: (u, { eq }) => eq(u.id, session.userId)
            })

            if (!dbUser?.email) {
              // throw new Error('No email associated with this account')
              throw new APIError('FORBIDDEN', {
                message: 'No email associated with this account'
              })
            }

            const [entry] = await db
              .select()
              .from(envySchema.waitlist)
              .where(
                and(
                  eq(envySchema.waitlist.email, dbUser.email),
                  eq(envySchema.waitlist.status, 'approved')
                )
              )
              .limit(1)

            if (!entry) {
              // throw new Error('This email is not approved for early access')
              throw new APIError('FORBIDDEN', {
                message: 'This email is not approved for early access'
              })
            }
          }
        }
      }
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
