'use client'

import { cn } from '@envy/ui/lib/utils'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'

const REVEAL_EASE = [0.23, 1, 0.32, 1] as const

const STEPS = [
  {
    num: '01',
    cmd: 'envy login',
    desc: 'Authenticate once via GitHub'
  },
  {
    num: '02',
    cmd: 'envy init',
    desc: 'Link this repo to a project'
  },
  {
    num: '03',
    cmd: 'envy pull',
    desc: 'Everyone gets the latest secrets'
  }
] as const

export function HowItWorks() {
  const [copied, setCopied] = useState<string | null>(null)
  const reduce = useReducedMotion()

  async function copy(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd)
    } catch {
      // ignore
    }
    setCopied(cmd)
    window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <section
      id="how"
      className="mx-auto max-w-7xl scroll-mt-16 border-x border-b border-border"
    >
      <div className="grid lg:grid-cols-[5fr_7fr]">
        <div className="border-b border-border px-6 py-14 sm:px-10 sm:py-16 lg:border-r lg:border-b-0">
          <p className="mb-4 font-mono text-[11px] text-text-muted">
            01 / SETUP
          </p>
          <h2 className="mb-4 max-w-sm text-[28px] leading-[1.08] font-bold tracking-[-0.02em] text-text-primary sm:text-[36px]">
            A new teammate is three commands from productive.
          </h2>
          <p className="max-w-[360px] text-pretty text-[14.5px] leading-[1.65] text-text-secondary">
            No onboarding doc. No &quot;ask João for the staging keys&quot;.
            Auth once, link the repo, pull.
          </p>
        </div>
        <div className="flex flex-col justify-center">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.cmd}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: REVEAL_EASE }}
            >
              <button
                type="button"
                onClick={() => copy(step.cmd)}
                className="grid w-full cursor-pointer grid-cols-[48px_1fr] items-center gap-3 border-b border-ghost-divider bg-transparent px-6 py-5 text-left transition-colors hover:bg-ghost-bg sm:grid-cols-[56px_200px_1fr_auto] sm:gap-4 sm:px-8"
              >
                <span className="font-mono text-[11px] text-text-muted">
                  {step.num}
                </span>
                <span className="font-mono text-[14px] text-text-primary sm:text-[14.5px]">
                  <span className="text-text-muted">$ </span>
                  {step.cmd}
                </span>
                <span className="col-span-2 text-[13px] text-text-secondary sm:col-span-1">
                  {step.desc}
                </span>
                <span className="relative hidden font-mono text-[10.5px] text-text-muted sm:inline-grid">
                  <span
                    className={cn(
                      'col-start-1 row-start-1 transition-opacity duration-150 ease-snappy motion-reduce:transition-none',
                      copied === step.cmd ? 'opacity-0' : 'opacity-100'
                    )}
                  >
                    copy ⧉
                  </span>
                  <span
                    className={cn(
                      'col-start-1 row-start-1 transition-opacity duration-150 ease-snappy motion-reduce:transition-none',
                      copied === step.cmd ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden={copied !== step.cmd}
                  >
                    copied ✓
                  </span>
                </span>
              </button>
            </motion.div>
          ))}
          <div className="px-6 py-5 font-mono text-[12px] text-brand sm:px-8">
            ✓ 12 secrets synced to .env.local · 243ms
          </div>
        </div>
      </div>
    </section>
  )
}
