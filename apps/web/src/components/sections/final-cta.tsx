'use client'

import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { WAITLIST_MODE } from '@/lib/env'
import { scrollToSection } from '@/lib/smooth-scroll'

export function FinalCta() {
  const [copied, setCopied] = useState(false)
  const ctaMain = WAITLIST_MODE ? 'Join the waitlist' : 'Create free account'

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText('npm i -g useenvy')
    } catch {
      // ignore
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="mx-auto max-w-7xl border-x border-b border-border px-6 py-20 text-center sm:px-10 sm:py-24">
      <h2 className="mb-4 text-[32px] leading-[1.06] font-bold tracking-[-0.025em] text-text-primary sm:text-[44px]">
        Delete the pinned .env message
        <span className="text-brand">.</span>
      </h2>
      <p className="mb-8 text-[15.5px] text-text-secondary">
        Two minutes from install to your first synced secret.
      </p>
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {WAITLIST_MODE ? (
          <button
            type="button"
            onClick={() => scrollToSection('waitlist')}
            className="cursor-pointer rounded bg-primary px-7 py-3.5 text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            {ctaMain}
          </button>
        ) : (
          <Link
            to="/login"
            className="rounded bg-primary px-7 py-3.5 text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            {ctaMain}
          </Link>
        )}
        <button
          type="button"
          onClick={copyInstall}
          className="cursor-pointer rounded border border-ghost-border bg-transparent px-5 py-3.5 font-mono text-[13px] text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary"
        >
          $ npm i -g useenvy {copied ? 'copied ✓' : 'copy ⧉'}
        </button>
      </div>
    </section>
  )
}
