import { db, eq } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { createServerFn } from '@tanstack/react-start'

import { optionalAuthMiddleware } from '@/middleware/auth'

export type AuthState =
  | {
      userId: string
      onboardingCompletedAt: Date | null
      onboardingSkippedAt: Date | null
    }
  | null

export const getAuthState = createServerFn({ method: 'GET' })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<AuthState> => {
    const session = context.session
    if (!session?.user?.id) {
      return null
    }

    const row = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: {
        onboardingCompletedAt: true,
        onboardingSkippedAt: true
      }
    })

    if (!row) {
      return null
    }

    return {
      userId: session.user.id,
      onboardingCompletedAt: row.onboardingCompletedAt ?? null,
      onboardingSkippedAt: row.onboardingSkippedAt ?? null
    }
  })
