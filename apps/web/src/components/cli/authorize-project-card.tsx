import { useEffect, useState } from 'react'

type User = {
  name?: string | null
  email: string
  image?: string | null
}

type Props = {
  sessionToken: string
  expiresAt: string
  onAuthorize: () => void
  onCancel: () => void
  isAuthorizing: boolean
  isCancelling: boolean
  error?: string
  user?: User
}

function formatRemaining(ms: number) {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000))
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function shortSession(token: string) {
  if (token.length <= 8) return token
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

export function AuthorizeProjectCard({
  sessionToken,
  expiresAt,
  onAuthorize,
  onCancel,
  isAuthorizing,
  isCancelling,
  error,
  user
}: Props) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const expired = remainingMs === 0
  const displayName = user?.name ?? user?.email ?? 'you'

  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-md border border-ghost-border bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border px-7 py-3.5">
        <span className="size-[7px] shrink-0 rounded-full bg-warning" />
        <span className="font-mono text-[11px] text-text-secondary">
          CLI AUTHORIZATION REQUEST · expires in {formatRemaining(remainingMs)}
        </span>
      </div>

      <div className="px-7 pt-8 pb-7">
        <h1 className="mb-1.5 text-[20px] font-bold tracking-[-0.015em] text-text-primary">
          A terminal wants in
          <span className="text-brand">.</span>
        </h1>
        <p className="mb-6 text-[13px] leading-[1.6] text-text-secondary">
          Someone ran{' '}
          <span className="font-mono text-text-primary">envy login</span>. If it
          was you, approve below — the CLI gets a scoped API key, never your
          password.
        </p>

        <div className="mb-6 rounded border border-ghost-border bg-surface-2 px-[18px] py-4 font-mono text-[12px] leading-[2] text-text-primary">
          <div>
            <span className="text-text-muted">account&nbsp;&nbsp;</span>
            {displayName}
          </div>
          {user?.email && user.name ? (
            <div>
              <span className="text-text-muted">
                email&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
              {user.email}
            </div>
          ) : null}
          <div>
            <span className="text-text-muted">session&nbsp;&nbsp;</span>
            {shortSession(sessionToken)}
          </div>
          <div>
            <span className="text-text-muted">expires&nbsp;&nbsp;</span>
            {expired ? (
              <span className="text-danger">expired</span>
            ) : (
              formatRemaining(remainingMs)
            )}
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-center font-mono text-[12px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onAuthorize}
            disabled={isAuthorizing || isCancelling || expired}
            className="flex flex-1 cursor-pointer items-center justify-center rounded bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAuthorizing ? (
              <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              'Approve access'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isAuthorizing || isCancelling}
            className="flex flex-1 cursor-pointer items-center justify-center rounded border border-danger/40 py-3 text-[13.5px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCancelling ? (
              <span className="size-4 animate-spin rounded-full border-2 border-danger/30 border-t-danger" />
            ) : (
              'Deny'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
