import { cors } from '@elysiajs/cors'
import { createTRPCContext } from '@envy/api/context'
import { appRouter } from '@envy/api/routers/index'
import { auth } from '@envy/auth'
import { createCustomerPortal } from '@envy/auth/billing'
import { and, db, eq } from '@envy/db'
import { member, organization } from '@envy/db/schema/organization'
import { env } from '@envy/env/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { Elysia } from 'elysia'
import { waitlistRoutes } from './routes/waitlist'

const WEB_ORIGIN = env.CORS_ORIGIN.replace(/\/$/, '')

function mapOAuthErrorCode(raw: string): string {
  const msg = raw.toLowerCase()
  if (
    msg.includes('waitlist_not_approved') ||
    msg.includes('not approved for early access')
  ) {
    return 'not_approved'
  }
  if (msg.includes('access_denied') || msg.includes('oauth_denied')) {
    return 'oauth_denied'
  }
  if (
    msg.includes('state') ||
    msg.includes('verification') ||
    msg.includes('please_restart') ||
    msg.includes('invalid_code') ||
    msg.includes('bad_verification')
  ) {
    return 'oauth_code'
  }
  if (msg.includes('forbidden') && msg.includes('early access')) {
    return 'not_approved'
  }
  return 'oauth_failed'
}

function loginErrorRedirect(code: string) {
  return Response.redirect(
    `${WEB_ORIGIN}/login?error=${encodeURIComponent(code)}`,
    302
  )
}

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
  .onAfterHandle(({ response }) => {
    if (response instanceof Response) {
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }
  })
  .use(waitlistRoutes)
  .get('/api/billing/portal', async ({ request, status }) => {
    const organizationId = new URL(request.url).searchParams.get(
      'organizationId'
    )
    if (!organizationId) return status(400, 'organizationId is required')
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return status(401, 'Authentication required')
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id)
      ),
      columns: { id: true }
    })
    if (!membership) return status(403, 'Access denied')
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { slug: true }
    })
    if (!org) return status(404, 'Organization not found')
    try {
      const portal = await createCustomerPortal({
        organizationId,
        returnUrl: `${env.APP_URL.replace(/\/$/, '')}/org/${org.slug}/settings/billing`
      })
      return Response.redirect(portal.url, 302)
    } catch {
      return status(400, 'Customer portal is not available')
    }
  })
  .all('/api/auth/*', async (context) => {
    const { request, status } = context
    if (!['POST', 'GET'].includes(request.method)) {
      return status(405)
    }

    const response = await auth.handler(request)
    const isCallback = request.url.includes('/callback/')

    if (!isCallback) {
      return response
    }

    // Better Auth often responds with a redirect to errorURL?error=… on state
    // failures (302), not a JSON 4xx. Normalize those to the web login page.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location')
      if (location) {
        try {
          const dest = new URL(location, env.BETTER_AUTH_URL)
          const errParam =
            dest.searchParams.get('error') ||
            dest.searchParams.get('error_description') ||
            ''
          if (errParam) {
            return loginErrorRedirect(mapOAuthErrorCode(errParam))
          }
          // Successful OAuth redirects to the app — pass through.
          return response
        } catch {
          return response
        }
      }
    }

    if (response.status >= 400) {
      let raw = ''
      try {
        const body = (await response.clone().json()) as {
          message?: string
          code?: string
          error?: string
        }
        raw = `${body.message ?? ''} ${body.code ?? ''} ${body.error ?? ''}`
      } catch {
        raw = ''
      }
      const ghError = new URL(request.url).searchParams.get('error')
      return loginErrorRedirect(
        mapOAuthErrorCode(ghError || raw || 'oauth_failed')
      )
    }

    return response
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
      createContext: () =>
        createTRPCContext({
          headers: context.request.headers,
          db,
          resolveCookieSession: async (headers) => {
            const session = await auth.api.getSession({ headers })
            if (!session?.user) return null
            return {
              user: { id: session.user.id },
              session: { id: session.session.id }
            }
          }
        })
    })
    return res
  })
  .get('/', () => 'OK')

const PORT = Number(process.env.PORT) || 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
