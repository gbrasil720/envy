import { createMiddleware } from '@tanstack/react-start'

import { authClient } from '@/lib/auth-client'

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session = await authClient.getSession({
      fetchOptions: {
        headers: request.headers,
        throw: true
      }
    })
    return next({
      context: { session }
    })
  }
)

/** Same cookie/session forwarding as authMiddleware, but does not throw when logged out. */
export const optionalAuthMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const { data: session } = await authClient.getSession({
      fetchOptions: {
        headers: request.headers
      }
    })
    return next({
      context: { session: session ?? null }
    })
  }
)
