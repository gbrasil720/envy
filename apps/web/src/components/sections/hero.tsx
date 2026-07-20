'use client'

import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { WAITLIST_MODE } from '@/lib/env'
import { scrollToSection } from '@/lib/smooth-scroll'

const OK = '#3dd68c'
const DIM = 'rgba(238,239,238,.25)'
const RED = '#ff4d4d'

const MANIFEST = [
  {
    key: 'DATABASE_URL',
    dev: '●',
    stg: '●',
    prd: '●',
    devColor: OK,
    stgColor: OK,
    prdColor: OK,
    prdSize: '12.5px',
    bg: 'transparent'
  },
  {
    key: 'STRIPE_SECRET',
    dev: '●',
    stg: '●',
    prd: '●',
    devColor: OK,
    stgColor: OK,
    prdColor: OK,
    prdSize: '12.5px',
    bg: 'transparent'
  },
  {
    key: 'REDIS_URL',
    dev: '●',
    stg: '●',
    prd: 'missing',
    devColor: OK,
    stgColor: OK,
    prdColor: RED,
    prdSize: '10px',
    bg: 'rgba(255,77,77,.04)'
  },
  {
    key: 'OPENAI_API_KEY',
    dev: '●',
    stg: '●',
    prd: '●',
    devColor: OK,
    stgColor: OK,
    prdColor: OK,
    prdSize: '12.5px',
    bg: 'transparent'
  },
  {
    key: 'RESEND_KEY',
    dev: '●',
    stg: '—',
    prd: '●',
    devColor: OK,
    stgColor: DIM,
    prdColor: OK,
    prdSize: '12.5px',
    bg: 'transparent'
  },
  {
    key: 'JWT_SECRET',
    dev: '●',
    stg: '●',
    prd: '●',
    devColor: OK,
    stgColor: OK,
    prdColor: OK,
    prdSize: '12.5px',
    bg: 'transparent'
  }
] as const

export function Hero() {
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
    <section className="mx-auto grid max-w-7xl border-x border-b border-border lg:grid-cols-2">
      <div className="border-b border-border px-6 py-16 sm:px-10 sm:py-20 lg:border-r lg:border-b-0 lg:py-24">
        <p className="mb-6 font-mono text-[11px] text-text-muted">
          {'// secrets manager for people who ship'}
        </p>
        <h1 className="mb-5 max-w-xl text-[36px] leading-[1.04] font-bold tracking-[-0.025em] text-text-primary sm:text-[48px] lg:text-[52px]">
          Your production keys are sitting in Slack right now
          <span className="text-brand">.</span>
        </h1>
        <p className="mb-8 max-w-[430px] text-pretty text-[15px] leading-[1.65] text-text-secondary sm:text-[16px]">
          envy moves them somewhere sane: encrypted at rest, synced by CLI,
          audited on every read. Delete the pinned .env message forever.
        </p>
        <div className="flex max-w-[420px] flex-col gap-3">
          <button
            type="button"
            onClick={copyInstall}
            className="flex cursor-pointer items-center justify-between rounded border border-ghost-border bg-surface-2 px-4 py-3 text-left font-mono text-[13px] text-text-primary transition-colors hover:border-border-focus"
          >
            <span>
              <span className="text-text-muted">$ </span>npm i -g useenvy
            </span>
            <span className="text-[11px] text-text-muted">
              {copied ? 'copied ✓' : 'copy ⧉'}
            </span>
          </button>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            {WAITLIST_MODE ? (
              <button
                type="button"
                onClick={() => scrollToSection('waitlist')}
                className="flex-1 cursor-pointer rounded bg-primary py-3 text-center text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-white"
              >
                {ctaMain}
              </button>
            ) : (
              <Link
                to="/login"
                className="flex-1 rounded bg-primary py-3 text-center text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-white"
              >
                {ctaMain}
              </Link>
            )}
            <button
              type="button"
              onClick={() => scrollToSection('how')}
              className="flex-1 cursor-pointer rounded border border-ghost-border py-3 text-center text-[14px] text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary"
            >
              Read the docs
            </button>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            free plan · no card · open-source CLI
          </p>
        </div>
      </div>

      <div className="flex min-h-[320px] flex-col bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 font-mono text-[11px] text-text-muted">
          <span>my-saas / manifest</span>
          <span className="text-brand">● synced 243ms ago</span>
        </div>
        <div className="flex-1 font-mono text-[12.5px]">
          <div className="grid grid-cols-[1.7fr_.6fr_.6fr_.7fr] border-b border-ghost-divider px-6 py-2.5 text-[10px] tracking-[0.08em] text-text-muted">
            <span>KEY</span>
            <span>dev</span>
            <span>stg</span>
            <span>prd</span>
          </div>
          {MANIFEST.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1.7fr_.6fr_.6fr_.7fr] border-b border-ghost-divider px-6 py-2.5 transition-colors hover:bg-ghost-bg"
              style={{ background: row.bg }}
            >
              <span className="text-text-primary">{row.key}</span>
              <span style={{ color: row.devColor }}>{row.dev}</span>
              <span style={{ color: row.stgColor }}>{row.stg}</span>
              <span style={{ color: row.prdColor, fontSize: row.prdSize }}>
                {row.prd}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-6 py-3 font-mono text-[11px] text-text-secondary">
          <span className="text-brand">✓</span> maria pushed STRIPE_SECRET · prd
          · 2h ago —{' '}
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="cursor-pointer text-text-muted underline transition-colors hover:text-brand"
          >
            audit log
          </button>
        </div>
      </div>
    </section>
  )
}
