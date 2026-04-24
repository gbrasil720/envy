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

const app = new Elysia()
  .use(
    cors({
      origin: true,
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
  .all('/api/auth/*', async (context) => {
    const { request, status } = context
    if (['POST', 'GET'].includes(request.method)) {
      return auth.handler(request)
    }
    return status(405)
  })
  .all('/trpc/*', async (context) => {
    const res = await fetchRequestHandler({
      endpoint: '/trpc',
      router: appRouter,
      req: context.request,
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
