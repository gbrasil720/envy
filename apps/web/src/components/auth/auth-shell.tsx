import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { EnvyWordmark } from '@/components/brand'

type AuthShellProps = {
  children: ReactNode
  /** Mono hint in the header, e.g. "// auth" */
  headerHint?: string
  /** Optional right-side header action (e.g. skip onboarding) */
  headerAction?: ReactNode
}

export function AuthShell({
  children,
  headerHint = '// auth',
  headerAction
}: AuthShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-bg text-text-primary">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6 sm:px-8">
        <Link to="/">
          <EnvyWordmark markSize={20} className="text-[15px]" />
        </Link>
        {headerAction ?? (
          <span className="font-mono text-[11px] text-text-muted">
            {headerHint}
          </span>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>

      <footer className="flex shrink-0 items-center justify-between border-t border-border px-6 py-5 font-mono text-[10.5px] text-text-muted sm:px-8">
        <span>AES-256-GCM at rest · audit on every read</span>
        <span>useenvy.dev</span>
      </footer>
    </div>
  )
}
