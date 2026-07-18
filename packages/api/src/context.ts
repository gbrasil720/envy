import { hashToken } from '@envy/crypto'
import type { db as DbInstance } from '@envy/db'
import { eq } from '@envy/db'
import { apiKey } from '@envy/db/schema/envy'
import type { Context as ElysiaContext } from 'elysia'

export type CreateContextOptions = {
	context: ElysiaContext
}

export type Context = {
	db: typeof DbInstance
	authHeader: string | null
	cookieHeader: string | null
	session: { user: { id: string } } | null
	apiKeyId?: string | null
}

export type CreateTRPCContextInput = {
	headers: Headers
	db: typeof DbInstance
	resolveCookieSession: (
		headers: Headers
	) => Promise<{ user: { id: string } } | null>
}

/**
 * Dual identity: Bearer API key (CLI) or cookie session (web).
 */
export async function createTRPCContext(
	input: CreateTRPCContextInput
): Promise<Context> {
	const authHeader = input.headers.get('authorization')
	const cookieHeader = input.headers.get('cookie')
	const { db } = input

	const bearerMatch = authHeader?.match(/^Bearer\s+([A-Za-z0-9_\-.]+)$/)
	if (bearerMatch) {
		const token = bearerMatch[1]
		if (token) {
			const key = await db.query.apiKey.findFirst({
				where: eq(apiKey.keyHash, await hashToken(token)),
				columns: { id: true, userId: true, revokedAt: true }
			})

			if (key && !key.revokedAt) {
				return {
					db,
					authHeader,
					cookieHeader,
					apiKeyId: key.id,
					session: {
						user: { id: key.userId }
					}
				}
			}
		}
	}

	if (cookieHeader) {
		const session = await input.resolveCookieSession(input.headers)
		if (session?.user) {
			return {
				db,
				authHeader,
				cookieHeader,
				apiKeyId: null,
				session: { user: { id: session.user.id } }
			}
		}
	}

	return {
		db,
		authHeader,
		cookieHeader,
		apiKeyId: null,
		session: null
	}
}
