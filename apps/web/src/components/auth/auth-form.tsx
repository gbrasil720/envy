'use client'

import { GithubIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { AccessDeniedCard } from './access-denied-card'

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { error } = useSearch({ from: '/login' })

  const handleGithubLogin = async () => {
    setIsLoading(true)

    authClient.signIn
      .social({
        provider: 'github',
        callbackURL: `${window.location.origin}/auth/callback`,
        errorCallbackURL: `${window.location.origin}/login?error=oauth_failed`
      })
      .then((data) => {
        if (data.error) {
          toast.error(data.error.message)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  if (error === 'not_approved') {
    return <AccessDeniedCard />
  }

  const oauthErrorMessage =
    error === 'oauth_code' || error === 'please_restart_the_process'
      ? 'GitHub login session expired or was interrupted. Click Continue with GitHub again (do not reuse a back-button redirect). Callback URL must be exactly http://localhost:3000/api/auth/callback/github in local dev.'
      : error === 'oauth_denied'
        ? 'GitHub authorization was cancelled.'
        : error === 'oauth_failed'
          ? 'GitHub login failed. Try again in a moment.'
          : error === 'state_mismatch'
            ? 'OAuth state mismatch — start login again from this tab (clear site cookies for localhost if it keeps happening).'
            : error

  return (
    <div className="w-full max-w-[400px]">
      <div className="overflow-hidden rounded-md border border-ghost-border bg-surface">
        <div className="px-9 pt-9 pb-7">
          <h1 className="mb-1.5 text-[22px] font-bold tracking-[-0.015em] text-text-primary">
            Log in to envy
          </h1>
          <p className="mb-7 text-[13px] text-text-secondary">
            Your secrets are waiting. Encrypted, obviously.
          </p>

          {oauthErrorMessage ? (
            <div className="mb-5 rounded border border-danger/40 bg-danger/10 px-3 py-2.5 font-mono text-[12px] text-danger">
              {oauthErrorMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={isLoading}
            className="mb-0 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <HugeiconsIcon
                icon={GithubIcon}
                size={16}
                className="text-primary-foreground"
              />
            )}
            {isLoading ? 'Connecting…' : 'Continue with GitHub'}
          </button>
        </div>

        <div className="border-t border-border px-9 py-4 text-[12px] text-text-muted">
          No account?{' '}
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={isLoading}
            className="cursor-pointer text-text-primary underline transition-colors hover:text-brand disabled:opacity-70"
          >
            Create one free
          </button>{' '}
          — no card required.
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-text-muted">
        By continuing you agree to our{' '}
        <Link
          to="/"
          className="text-text-secondary underline underline-offset-4 transition-colors hover:text-brand"
        >
          Terms
        </Link>{' '}
        and{' '}
        <Link
          to="/"
          className="text-text-secondary underline underline-offset-4 transition-colors hover:text-brand"
        >
          Privacy
        </Link>
        .
      </p>
    </div>
  )
}
