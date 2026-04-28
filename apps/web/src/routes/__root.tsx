import type { AppRouter } from '@envy/api/routers/index'
import { Toaster } from '@envy/ui/components/sonner'
import { TooltipProvider } from '@envy/ui/components/tooltip'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { NotFound } from '@/components/not-found'
import { ThemeProvider } from '@/components/theme-provider'
import appCss from '../index.css?url'

export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8'
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover'
      },
      {
        title: 'envy'
      }
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com'
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous'
      },
      {
        rel: 'stylesheet',
        href: appCss
      },
      {
        rel: 'icon',
        href: '/favicon.ico'
      }
    ],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem('vite-ui-theme');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=(t==='light'||t==='dark')?t:(t==='system'?sys:'dark');document.documentElement.classList.add(r);}catch(e){document.documentElement.classList.add('dark');}})();`
      }
    ]
  }),

  component: RootDocument
})

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      {/** biome-ignore lint/style/noHeadElement: <> */}
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <TooltipProvider delay={300}>
            <div className="grid h-svh min-w-0 max-w-[100vw] grid-rows-[auto_1fr] overflow-x-clip">
              <Outlet />
            </div>
            <Toaster richColors />
          </TooltipProvider>
        </ThemeProvider>
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
