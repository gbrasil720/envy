'use client'

import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import {
  ArrowRight01Icon,
  GithubIcon,
  TerminalIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { trpc } from '@/lib/trpc'
import { AuthorizationExpiredCard } from '../cli/authorization-expired-card'
import { AuthorizeProjectCard } from '../cli/authorize-project-card'
import { ProjectAuthorizedCard } from '../cli/project-authorized-card'

const MotionCard = motion.create(Card)

type Props = {
  sessionToken: string | undefined
}

function LoginCard({ sessionToken }: { sessionToken: string | undefined }) {
  const [loading, setLoading] = useState(false)

  const handleGitHub = async () => {
    setLoading(true)
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: sessionToken
        ? `/cli-auth?session=${sessionToken}`
        : '/cli-auth'
    })
  }

  return (
    <MotionCard
      key="unauth"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0 overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 right-0 bg-brand/5 border-b border-brand/20 px-6 py-3 flex items-center gap-2">
        <HugeiconsIcon icon={TerminalIcon} size={16} className="text-brand" />
        <span className="text-brand text-[13px] font-medium">
          CLI Authorization Request detected. Login to continue.
        </span>
      </div>
      <CardContent className="p-10 mt-10">
        <div className="flex flex-col items-center mb-8">
          <h2 className="font-display font-semibold text-2xl text-text-primary mb-2">
            Welcome back.
          </h2>
          <p className="text-text-secondary text-sm text-center">
            Authenticate to grant CLI access.
          </p>
        </div>
        <Button
          onClick={handleGitHub}
          disabled={loading}
          className="w-full h-12 bg-surface-2 border border-ghost-border rounded-[10px] flex items-center justify-center gap-3 hover:bg-ghost-bg transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? (
            <div className="size-5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
          ) : (
            <>
              <HugeiconsIcon
                icon={GithubIcon}
                size={20}
                className="text-white"
              />
              <span className="font-medium text-text-primary">
                Continue with GitHub
              </span>
            </>
          )}
        </Button>
        <div className="my-6 flex items-center gap-4">
          <div className="h-[0.5px] flex-1 bg-ghost-border" />
          <span className="text-[12px] text-text-muted uppercase tracking-widest">
            or
          </span>
          <div className="h-[0.5px] flex-1 bg-ghost-border" />
        </div>
        <div className="space-y-4 opacity-50 pointer-events-none">
          <div className="h-12 bg-ghost-bg border border-border rounded-[10px] px-4 flex items-center text-text-muted text-sm">
            your@email.com
          </div>
          <Button className="w-full h-12 bg-brand/10 text-brand/40 rounded-[10px] font-medium flex items-center justify-center gap-2">
            Continue <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </div>
      </CardContent>
    </MotionCard>
  )
}

export function AuthFormCli({ sessionToken }: Props) {
  const { data: sessionData, isPending } = authClient.useSession()
  const [approved, setApproved] = useState(false)
  const [expired, setExpired] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const { data: sessionInfo, isError: sessionNotFound } = useQuery(
    trpc.cliAuth.getSession.queryOptions(
      { token: sessionToken! },
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
      <div className="relative z-10 w-full max-w-[480px] px-6 flex items-center justify-center py-20">
        <div className="size-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative z-10 w-full max-w-[480px] px-6">
      <AnimatePresence mode="wait">
        {!sessionData?.user && <LoginCard sessionToken={sessionToken} />}
        {sessionData?.user && (expired || sessionNotFound) && (
          <AuthorizationExpiredCard key="expired" />
        )}
        {sessionData?.user && cancelled && (
          <AuthorizationExpiredCard key="cancelled" />
        )}
        {sessionData?.user && approved && (
          <ProjectAuthorizedCard key="success" />
        )}
        {sessionData?.user &&
          !approved &&
          !expired &&
          !cancelled &&
          !sessionNotFound && (
            <AuthorizeProjectCard
              key="authorize"
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
          )}
      </AnimatePresence>
    </div>
  )
}
