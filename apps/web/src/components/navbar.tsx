'use client'

import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { EnvyWordmark } from '@/components/brand'
import { WAITLIST_MODE } from '@/lib/env'
import { scrollToSection } from '@/lib/smooth-scroll'

const GITHUB_URL = 'https://github.com/gbrasil720/envy'

const NAV_LINKS = [
  { name: 'How it works', id: 'how' },
  { name: 'Features', id: 'features' },
  { name: 'Pricing', id: 'pricing' },
  { name: 'FAQ', id: 'faq' }
] as const

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const ctaShort = WAITLIST_MODE ? 'Join waitlist' : 'Create account'

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isMobileMenuOpen])

  function handleNavClick(id: string) {
    setIsMobileMenuOpen(false)
    scrollToSection(id)
  }

  return (
    <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-bg/92 px-4 backdrop-blur-sm sm:px-8">
      <div className="flex min-w-0 items-center gap-9">
        <Link to="/" className="shrink-0">
          <EnvyWordmark markSize={20} className="text-[15px]" />
        </Link>
        <div className="hidden items-center gap-6 text-[13px] md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault()
                scrollToSection(link.id)
              }}
              className="text-text-secondary transition-colors hover:text-brand"
            >
              {link.name}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary transition-colors hover:text-brand"
          >
            GitHub ↗
          </a>
        </div>
      </div>

      <div className="hidden items-center gap-5 md:flex">
        {!WAITLIST_MODE ? (
          <Link
            to="/login"
            className="text-[13px] text-text-secondary transition-colors hover:text-brand"
          >
            Log in
          </Link>
        ) : null}
        {WAITLIST_MODE ? (
          <button
            type="button"
            onClick={() => scrollToSection('waitlist')}
            className="cursor-pointer rounded bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            {ctaShort}
          </button>
        ) : (
          <Link
            to="/login"
            className="rounded bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            {ctaShort}
          </Link>
        )}
      </div>

      <button
        type="button"
        className="flex size-10 items-center justify-center text-text-primary md:hidden"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((o) => !o)}
      >
        <HugeiconsIcon
          icon={isMobileMenuOpen ? Cancel01Icon : Menu01Icon}
          size={22}
        />
      </button>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 top-14 z-40 flex flex-col gap-1 border-t border-border bg-bg px-6 py-8 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="py-3 text-lg font-semibold text-text-primary"
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(link.id)
              }}
            >
              {link.name}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 text-lg font-semibold text-text-primary"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            GitHub ↗
          </a>
          <div className="mt-6 flex flex-col gap-3">
            {!WAITLIST_MODE ? (
              <Link
                to="/login"
                className="text-center text-[14px] text-text-secondary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
            ) : null}
            {WAITLIST_MODE ? (
              <button
                type="button"
                onClick={() => handleNavClick('waitlist')}
                className="cursor-pointer rounded bg-primary py-3 text-center text-[14px] font-semibold text-primary-foreground"
              >
                {ctaShort}
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded bg-primary py-3 text-center text-[14px] font-semibold text-primary-foreground"
              >
                {ctaShort}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
