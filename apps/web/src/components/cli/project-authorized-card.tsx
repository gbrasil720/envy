'use client'

import { authClient } from '@/lib/auth-client'

export function ProjectAuthorizedCard() {
  const { data: sessionData } = authClient.useSession()
  const name =
    sessionData?.user?.name ?? sessionData?.user?.email ?? 'your account'

  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-md border border-brand/30 bg-surface text-center">
      <div className="px-9 py-12">
        <div className="mb-4 font-mono text-[32px] text-brand">✓</div>
        <h1 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-text-primary">
          CLI authorized
        </h1>
        <p className="mb-6 text-[13px] leading-[1.6] text-text-secondary">
          Head back to your terminal — it already has the key.
        </p>
        <div className="rounded border border-ghost-border bg-surface-2 px-[18px] py-3.5 text-left font-mono text-[12px] leading-[1.9]">
          <div className="text-brand">✓ authenticated as {name}</div>
          <div className="text-text-secondary">
            $ envy pull <span className="text-text-muted">← next step</span>
          </div>
        </div>
        <p className="mt-5 text-[11.5px] text-text-muted">
          You can close this tab.
        </p>
      </div>
    </div>
  )
}
