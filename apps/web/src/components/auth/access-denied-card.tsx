'use client'

import { useNavigate } from '@tanstack/react-router'

export function AccessDeniedCard() {
  const navigate = useNavigate()

  return (
    <div className="w-full max-w-[400px]">
      <div className="overflow-hidden rounded-md border border-danger/35 bg-surface">
        <div className="border-b border-danger/25 px-7 py-3.5">
          <div className="flex items-center gap-2.5 font-mono text-[11px] text-danger">
            <span className="size-1.5 animate-pulse rounded-full bg-danger" />
            ACCESS DENIED · private beta
          </div>
        </div>
        <div className="px-9 py-9">
          <h1
            role="alert"
            className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-text-primary"
          >
            You&apos;re not on the list yet
            <span className="text-brand">.</span>
          </h1>
          <p className="mb-6 text-[13px] leading-[1.6] text-text-secondary">
            Envy is in private beta. Your GitHub account isn&apos;t approved —
            try another account or request access.
          </p>
          <div className="mb-6 rounded border border-ghost-border bg-surface-2 px-4 py-3.5 font-mono text-[12px] leading-[1.9] text-text-secondary">
            <div>
              <span className="text-text-muted">{'// '}</span>
              approvals reviewed weekly
            </div>
            <div>
              <span className="text-brand">→ </span>
              we&apos;ll email when you&apos;re in
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigate({ to: '/login', search: {} })}
              className="w-full cursor-pointer rounded bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-white"
            >
              Try a different account
            </button>
            <button
              type="button"
              onClick={() => {
                navigate({ to: '/' })
              }}
              className="w-full cursor-pointer rounded border border-ghost-border py-3 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary"
            >
              Back to homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
