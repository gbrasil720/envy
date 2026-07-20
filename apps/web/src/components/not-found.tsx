'use client'

import { Link, useRouter } from '@tanstack/react-router'
import { EnvyWordmark } from '@/components/brand'

export function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-svh flex-col bg-bg text-text-primary">
      <header className="flex h-14 items-center border-b border-border px-6 sm:px-8">
        <Link to="/">
          <EnvyWordmark markSize={20} className="text-[15px]" />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-4 font-mono text-[11px] text-text-muted">
          {'// route not found'}
        </p>
        <h1 className="mb-3 text-[64px] font-bold tracking-[-0.03em] text-text-primary md:text-[88px]">
          404
          <span className="text-brand">.</span>
        </h1>
        <p className="mb-8 max-w-sm text-[14px] leading-relaxed text-text-secondary">
          This path doesn&apos;t exist — or your secrets took it somewhere
          safer.
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            to="/"
            className="rounded bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            Go home
          </Link>
          <button
            type="button"
            onClick={() => router.history.back()}
            className="cursor-pointer rounded border border-ghost-border px-5 py-2.5 text-[13px] text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary"
          >
            Go back
          </button>
        </div>
      </main>
      <footer className="border-t border-border px-6 py-5 font-mono text-[10.5px] text-text-muted sm:px-8">
        AES-256-GCM at rest · audit on every read
      </footer>
    </div>
  )
}
