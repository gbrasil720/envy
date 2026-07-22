'use client'

import { WaitlistForm } from '../forms/waitlist-form'

export function Waitlist() {
  return (
    <section
      id="waitlist"
      className="mx-auto max-w-7xl scroll-mt-16 border-x border-b border-border px-6 py-16 sm:px-10 sm:py-20"
    >
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 font-mono text-[11px] text-text-muted">
          {'// early access'}
        </p>
        <h2 className="mb-3 text-[28px] leading-[1.08] font-bold tracking-[-0.02em] text-text-primary sm:text-[36px]">
          Join the waitlist
          <span className="text-brand">.</span>
        </h2>
        <p className="mb-8 text-[14.5px] leading-[1.65] text-text-secondary">
          We&apos;re opening seats carefully. Drop your email and we&apos;ll let
          you in when it&apos;s your turn.
        </p>
        <WaitlistForm />
      </div>
    </section>
  )
}
