import { cors } from '@elysiajs/cors'
import { createTRPCContext } from '@envy/api/context'
import { appRouter } from '@envy/api/routers/index'
import { auth } from '@envy/auth'
import { db } from '@envy/db'
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
	.onAfterHandle(({ response }) => {
		if (response instanceof Response) {
			response.headers.set('X-Frame-Options', 'DENY')
			response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")
			response.headers.set('X-Content-Type-Options', 'nosniff')
		}
	})
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
			createContext: () =>
				createTRPCContext({
					headers: context.request.headers,
					db,
					resolveCookieSession: async (headers) => {
						const session = await auth.api.getSession({ headers })
						if (!session?.user) return null
						return { user: { id: session.user.id } }
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
