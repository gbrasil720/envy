'use client'

import { useState } from 'react'

const FAQ_ITEMS = [
  {
    q: 'Can you read my secrets?',
    a: 'No. Values are encrypted with AES-256-GCM using a per-project master key that is itself encrypted server-side. Decryption only happens when you pull — we store ciphertext.'
  },
  {
    q: 'What happens if I stop paying?',
    a: 'Your secrets stay readable and exportable. Paid limits stop applying to new writes, never to reads. No hostage data.'
  },
  {
    q: 'Does it work in CI?',
    a: 'Yes — create a token, set it as ENVY_TOKEN, and envy pull / envy run work in any pipeline.'
  },
  {
    q: 'Why not just use 1Password or Vault?',
    a: "Password managers aren't built for .env workflows; Vault is built for platform teams. envy is the middle: one CLI, per-environment sync, audit log — running in two minutes."
  }
] as const

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section
      id="faq"
      className="mx-auto grid max-w-7xl scroll-mt-16 border-x border-b border-border lg:grid-cols-[5fr_7fr]"
    >
      <div className="border-b border-border px-6 py-14 sm:px-10 sm:py-16 lg:border-r lg:border-b-0">
        <p className="mb-4 font-mono text-[11px] text-text-muted">04 / FAQ</p>
        <h2 className="text-[28px] leading-[1.08] font-bold tracking-[-0.02em] text-text-primary sm:text-[36px]">
          Fair questions
          <span className="text-brand">.</span>
        </h2>
      </div>
      <div>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={item.q} className="border-b border-ghost-divider">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent px-6 py-5 text-left transition-colors hover:bg-ghost-bg sm:px-8"
              >
                <span className="pr-4 text-[15px] font-semibold text-text-primary">
                  {item.q}
                </span>
                <span className="shrink-0 font-mono text-[13px] text-text-muted">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen ? (
                <p className="max-w-[560px] px-6 pb-6 text-[14px] leading-[1.65] text-text-secondary sm:px-8">
                  {item.a}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
