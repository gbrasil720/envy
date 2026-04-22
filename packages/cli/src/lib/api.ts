import type { AppRouter } from '@envy/api/routers/index'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { getAuth } from './auth'
import { API_URL } from './constants'

let _client: ReturnType<typeof createTRPCClient<AppRouter>> | null = null

export function getApiClient(): ReturnType<typeof createTRPCClient<AppRouter>> {
  if (_client) return _client

  const auth = getAuth()
  const baseUrl = auth?.api_url ?? API_URL

  _client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers: () => {
          const token = getAuth()?.token
          return token ? { Authorization: `Bearer ${token}` } : {}
        }
      })
    ]
  })

  return _client
}

export const api = new Proxy(
  {} as ReturnType<typeof createTRPCClient<AppRouter>>,
  {
    get(_, prop) {
      return (getApiClient() as Record<string | symbol, unknown>)[prop]
    }
  }
)
