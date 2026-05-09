import { cors } from '@elysiajs/cors'
import type { Context as ApiContext } from '@envy/api/context'
import { appRouter } from '@envy/api/routers/index'
import { auth } from '@envy/auth'
import { hashToken } from '@envy/crypto'
import { db, eq } from '@envy/db'
import { apiKey } from '@envy/db/schema/index'
import { env } from '@envy/env/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { Elysia } from 'elysia'
import { waitlistRoutes } from './routes/waitlist'

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-request-id',
        'x-better-auth-client',
        'x-visitor-id'
      ],
      credentials: true
    })
  )
  .use(waitlistRoutes)
  .all('/api/auth/*', async (context) => {
    const { request, status } = context
    if (['POST', 'GET'].includes(request.method)) {
      const response = await auth.handler(request)

      if (request.url.includes('/callback/') && response.status >= 400) {
        return Response.redirect(
          `${env.CORS_ORIGIN}/login?error=not_approved`,
          302
        )
      }

      return response
    }
    return status(405)
  })
  .all('/trpc/*', async (context) => {
    let req: Request
    if (['GET', 'HEAD'].includes(context.request.method)) {
      req = context.request
    } else {
      // Elysia's default parser already consumed context.request.body.
      // Reconstruct a fresh Request so fetchRequestHandler can read the body.
      const bodyText =
        context.body != null
          ? typeof context.body === 'string'
            ? context.body
            : JSON.stringify(context.body)
          : undefined
      req = new Request(context.request.url, {
        method: context.request.method,
        headers: context.request.headers,
        body: bodyText
      })
    }
    const res = await fetchRequestHandler({
      endpoint: '/trpc',
      router: appRouter,
      req,
      createContext: async (): Promise<ApiContext> => {
        const authHeader = context.request.headers.get('authorization')
        const cookieHeader = context.request.headers.get('cookie')

        const bearerMatch = authHeader?.match(/^Bearer\s+([A-Za-z0-9_\-.]+)$/)
        if (bearerMatch) {
          const token = bearerMatch[1]
          if (token) {
            const key = await db.query.apiKey.findFirst({
              where: eq(apiKey.keyHash, await hashToken(token)),
              columns: { userId: true, revokedAt: true }
            })

            if (key && !key.revokedAt) {
              return {
                db,
                authHeader,
                cookieHeader,
                session: {
                  user: { id: key.userId }
                } as unknown as ApiContext['session']
              }
            }
          }
        }

        if (cookieHeader) {
          const session = await auth.api.getSession({
            headers: context.request.headers
          })

          if (session?.user) {
            return { db, authHeader, session, cookieHeader }
          }
        }

        return { db, authHeader, session: null, cookieHeader }
      }
    })
    return res
  })
  .get('/', () => 'OK')

const PORT = Number(process.env.PORT) || 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
