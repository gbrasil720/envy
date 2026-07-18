import { redirect } from '@tanstack/react-router'
import { type AuthState, getAuthState } from './get-auth-state'

export type WebAuthMode =
  | 'auth-required'
  | 'onboarding-required'
  | 'onboarding-forbidden'

/**
 * Single web auth / onboarding gate for route beforeLoad handlers.
 * Preserves existing redirect targets and search params.
 */
export async function requireWebAuth(
  mode: WebAuthMode = 'onboarding-required'
): Promise<NonNullable<AuthState>> {
  const auth = await getAuthState()

  if (!auth) {
    throw redirect({ to: '/login' })
  }

  const onboardingDone = Boolean(
    auth.onboardingCompletedAt || auth.onboardingSkippedAt
  )

  if (mode === 'onboarding-required' && !onboardingDone) {
    throw redirect({ to: '/onboarding' })
  }

  if (mode === 'onboarding-forbidden' && onboardingDone) {
    throw redirect({
      to: '/dashboard',
      search: { project: '', section: 'secrets' as const }
    })
  }

  return auth
}
