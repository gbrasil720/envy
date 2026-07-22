'use client'

import { GithubIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'
import { AuthorizationExpiredCard } from '../cli/authorization-expired-card'
import { AuthorizeProjectCard } from '../cli/authorize-project-card'
import { ProjectAuthorizedCard } from '../cli/project-authorized-card'

type Props = {
  sessionToken: string | undefined
}

function LoginCard({ sessionToken }: { sessionToken: string | undefined }) {
  const [loading, setLoading] = useState(false)

  const handleGitHub = async () => {
    setLoading(true)
    const callbackPath = sessionToken
      ? `/cli-auth?session=${sessionToken}`
      : '/cli-auth'
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: `${window.location.origin}${callbackPath}`,
      errorCallbackURL: `${window.location.origin}/login?error=oauth_failed`
    })
  }

  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-md border border-ghost-border bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border px-7 py-3.5">
        <span className="size-[7px] shrink-0 rounded-full bg-warning" />
        <span className="font-mono text-[11px] text-text-secondary">
          CLI AUTHORIZATION REQUEST · login required
        </span>
      </div>
      <div className="px-9 pt-8 pb-7">
        <h1 className="mb-1.5 text-[20px] font-bold tracking-[-0.015em] text-text-primary">
          A terminal wants in
          <span className="text-brand">.</span>
        </h1>
        <p className="mb-6 text-[13px] leading-[1.6] text-text-secondary">
          Authenticate to approve the CLI handshake. Your password is never
          shared with the terminal.
        </p>
        <button
          type="button"
          onClick={handleGitHub}
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          ) : (
            <HugeiconsIcon
              icon={GithubIcon}
              size={16}
              className="text-primary-foreground"
            />
          )}
          {loading ? 'Connecting…' : 'Continue with GitHub'}
        </button>
      </div>
    </div>
  )
}

export function AuthFormCli({ sessionToken }: Props) {
  const trpc = useTRPC()
  const { data: sessionData, isPending } = authClient.useSession()
  const [approved, setApproved] = useState(false)
  const [expired, setExpired] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const { data: sessionInfo, isError: sessionNotFound } = useQuery(
    trpc.cliAuth.getSession.queryOptions(
      { token: sessionToken ?? '' },
      { enabled: !!sessionToken && !!sessionData?.user, retry: false }
    )
  )

  const approve = useMutation(
    trpc.cliAuth.approve.mutationOptions({
      onSuccess: () => setApproved(true),
      onError: (err) => {
        console.error(err)
        if (
          err.data?.code === 'UNAUTHORIZED' ||
          err.data?.code === 'NOT_FOUND'
        ) {
          setExpired(true)
        }
      }
    })
  )

  const cancel = useMutation(
    trpc.cliAuth.cancel.mutationOptions({
      onSuccess: () => setCancelled(true),
      onError: (err) => {
        console.error(err)
        if (
          err.data?.code === 'UNAUTHORIZED' ||
          err.data?.code === 'NOT_FOUND'
        ) {
          setExpired(true)
        }
      }
    })
  )

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-7 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    )
  }

  if (!sessionData?.user) {
    return <LoginCard sessionToken={sessionToken} />
  }

  if (expired || sessionNotFound || cancelled) {
    return <AuthorizationExpiredCard />
  }

  if (approved) {
    return <ProjectAuthorizedCard />
  }

  return (
    <AuthorizeProjectCard
      sessionToken={sessionToken || ''}
      expiresAt={
        sessionInfo?.expiresAt ??
        new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
      onAuthorize={() => approve.mutate({ token: sessionToken || '' })}
      onCancel={() => cancel.mutate({ token: sessionToken || '' })}
      isAuthorizing={approve.isPending}
      isCancelling={cancel.isPending}
      error={approve.error?.message}
      user={sessionData.user}
    />
  )
}
