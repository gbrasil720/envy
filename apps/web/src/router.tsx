import type { AppRouter } from '@envy/api/routers/index'
import { env } from '@envy/env/web'

import './index.css'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { toast } from 'sonner'

import Loader from './components/loader'
import { NotFound } from './components/not-found'
import { SERVER_URL } from './lib/env'
import { routeTree } from './routeTree.gen'
import { TRPCProvider } from './utils/trpc'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error.message, {
        action: {
          label: 'retry',
          onClick: query.invalidate
        }
      })
    }
  }),
  defaultOptions: { queries: { staleTime: 60 * 1000 } }
})

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${SERVER_URL}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include'
        })
      }
    })
  ]
})

const trpc = createTRPCOptionsProxy({
  client: trpcClient,
  queryClient: queryClient
})

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: { trpc, queryClient },
    defaultPendingComponent: Loader,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: NotFound,
    Wrap: function RouterWrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
            {children}
          </TRPCProvider>
        </QueryClientProvider>
      )
    }
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
