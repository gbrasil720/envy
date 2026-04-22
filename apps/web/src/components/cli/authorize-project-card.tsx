import { Button } from '@envy/ui/components/button'
import { Card, CardContent, CardFooter } from '@envy/ui/components/card'
import {
  Clock01Icon,
  Shield01Icon,
  TerminalIcon,
  Tick01Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

const MotionCard = motion.create(Card)

type Props = {
  sessionToken: string
  expiresAt: string
  onAuthorize: () => void
  onCancel: () => void
  isAuthorizing: boolean
  isCancelling: boolean
  error?: string
}

export function AuthorizeProjectCard({
  sessionToken,
  expiresAt,
  onAuthorize,
  onCancel,
  isAuthorizing,
  isCancelling,
  error
}: Props) {
  const totalMs = 5 * 60 * 1000 // 5 min
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const progressPct = (remainingMs / totalMs) * 100
  const remainingSecs = Math.ceil(remainingMs / 1000)

  const progressColor =
    remainingSecs > 60
      ? 'var(--color-brand)'
      : remainingSecs > 30
        ? '#f59e0b'
        : '#ef4444'

  return (
    <MotionCard
      key="authorizing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0"
    >
      <CardContent className="p-6 sm:p-10 md:p-12">
        <div className="flex items-center justify-center gap-6 mb-10">
          <div className="w-12 h-12 bg-ghost-bg border border-border rounded-xl flex items-center justify-center">
            <HugeiconsIcon
              icon={TerminalIcon}
              size={16}
              className="text-brand"
            />
          </div>
          <div className="text-text-muted font-display text-xl">→</div>
          <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
            >
              <rect
                x="6"
                y="6"
                width="20"
                height="20"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path
                d="M12 12L20 20M20 12L12 20"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-[26px] text-text-primary leading-tight mb-2">
            Authorize CLI access
          </h1>
          <p className="text-text-secondary text-sm">
            A CLI session is requesting access to your Envy account.
          </p>
        </div>

        <div className="bg-surface-2 border border-ghost-divider rounded-[10px] p-4 mb-8 space-y-3">
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-text-muted flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock01Icon} size={12} /> Requested
            </span>
            <span className="text-text-primary font-mono">Just now</span>
          </div>
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-text-muted flex items-center gap-1.5">
              <HugeiconsIcon icon={Shield01Icon} size={12} /> Expires
            </span>
            <span className="font-mono" style={{ color: progressColor }}>
              {remainingSecs > 0 ? `${remainingSecs}s` : 'Expired'}
            </span>
          </div>
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-text-muted flex items-center gap-1.5">
              <HugeiconsIcon
                icon={TerminalIcon}
                size={12}
                className="text-brand"
              />{' '}
              Session
            </span>
            <span className="text-text-primary font-mono">
              {sessionToken.slice(0, 8)}...
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {[
            'Read and write secrets in selected project',
            'Pull secrets to local environment',
            'Push secrets from local files'
          ].map((perm) => (
            <div
              key={perm}
              className="flex items-start gap-3 text-[13px] text-text-secondary"
            >
              <div className="mt-0.5 text-brand">
                <HugeiconsIcon icon={Tick01Icon} size={14} />
              </div>
              <span>{perm}</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-6 text-center text-[13px] text-danger">{error}</p>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-3 border-0 px-6 pb-6 sm:px-10 sm:pb-10 md:px-12 md:pb-12 pt-0">
        <Button
          onClick={onAuthorize}
          disabled={isAuthorizing || isCancelling || remainingSecs === 0}
          className="w-full h-12 bg-brand text-bg font-bold rounded-[10px] flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {isAuthorizing ? (
            <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
          ) : (
            <>
              <HugeiconsIcon
                icon={TerminalIcon}
                size={18}
                className="text-bg"
              />
              Authorize CLI access →
            </>
          )}
        </Button>

        <Button
          onClick={onCancel}
          disabled={isAuthorizing || isCancelling}
          className="w-full h-12 bg-transparent text-text-muted font-medium rounded-[10px] flex items-center justify-center hover:text-danger transition-colors disabled:opacity-50"
        >
          {isCancelling ? (
            <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
          ) : (
            'Cancel and revoke session'
          )}
        </Button>

        <div className="w-full mt-4">
          <div className="h-[2px] w-full bg-ghost-bg rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full"
              animate={{
                width: `${progressPct}%`,
                backgroundColor: progressColor
              }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
          <p className="text-center text-[11px] text-text-muted uppercase tracking-widest">
            This session expires in{' '}
            {remainingSecs > 0 ? `${remainingSecs} seconds` : 'now'}
          </p>
        </div>
      </CardFooter>
    </MotionCard>
  )
}
