import type { AppRouter } from '@envy/api/routers/index'
import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { inferRouterOutputs } from '@trpc/server'

import { SERVER_URL } from '@/lib/env'

export type AuthState = inferRouterOutputs<AppRouter>['me']['authState']

const forwardCookieMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const cookie = request.headers.get('cookie') ?? ''
    return next({ context: { cookie } })
  }
)

export const getAuthState = createServerFn({ method: 'GET' })
  .middleware([forwardCookieMiddleware])
  .handler(async ({ context }): Promise<AuthState> => {
    const client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${SERVER_URL}/trpc`,
          headers: () => ({
            cookie: context.cookie
          })
        })
      ]
    })

    return await client.me.authState.query()
  })
