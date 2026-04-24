import type { AppRouter } from '@envy/api/routers/index'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { queryClient } from '@/router'
import { SERVER_URL } from './env'

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: SERVER_URL ?? 'http://localhost:3000/trpc',
      fetch: (url, options) =>
        fetch(url, { ...options, credentials: 'include' })
    })
  ]
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: queryClient
})
