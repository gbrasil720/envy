/** biome-ignore-all lint/a11y/useAnchorContent: <> */
'use client'

import { Button } from '@envy/ui/components/button'
import {
  Cancel01Icon,
  GithubIcon,
  Menu01Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { WAITLIST_MODE } from '@/lib/env'
import { scrollToSection } from '@/lib/smooth-scroll'
import { ModeToggle } from './theme-toggle'

const GITHUB_URL = 'https://github.com/gbrasil720/envy'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)

      const sections = ['features', 'pricing', 'how-it-works']
      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isMobileMenuOpen])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 max-w-full transition-all duration-300 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+20px)] ${isScrolled ? 'border-b border-ghost-divider/90 bg-bg/45 pb-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-bg/40 dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)] sm:pb-4' : 'bg-transparent pb-5 sm:pb-6'}`}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between px-4 sm:px-6 md:grid md:grid-cols-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center">
            <img
              src="/logo-no-bg.png"
              alt="Envy"
              className="w-14 h-14 object-cover"
            />
          </div>
          <span className="text-xl font-display font-bold tracking-tight">
            envy
          </span>
        </Link>

        <div className="hidden md:flex items-center justify-center gap-8">
          {[
            { name: 'Features', id: 'features' },
            { name: 'How it works', id: 'how-it-works' },
            { name: 'Pricing', id: 'pricing' }
          ].map((link) => (
            <a
              key={link.name}
              href={`#${link.id}`}
              onClick={(e) => { e.preventDefault(); scrollToSection(link.id) }}
              className={`text-sm font-medium transition-all duration-200 pb-1 border-b-2 ${activeSection === link.id ? 'text-brand border-brand' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4 justify-end">
          <ModeToggle />
          <Button
            render={
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" />
            }
            variant="link"
            className="decoration-0 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hover:bg-none cursor-pointer"
          >
            <HugeiconsIcon icon={GithubIcon} size={18} />
            GitHub
          </Button>
          {WAITLIST_MODE ? (
            <Button
              render={<a href="#waitlist" onClick={(e) => { e.preventDefault(); scrollToSection('waitlist') }} />}
              className="text-sm bg-brand text-bg font-semibold rounded-lg p-5 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            >
              Join the waitlist
            </Button>
          ) : (
            <Button
              render={<Link to="/login" />}
              className="text-sm bg-brand text-bg font-semibold rounded-lg p-5 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            >
              Get started free
            </Button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2 justify-end">
          <ModeToggle />
          <Button
            type="button"
            variant="link"
            className="decoration-0 text-text-primary z-50 size-11 shrink-0"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <HugeiconsIcon
                icon={Cancel01Icon}
                className="cursor-pointer size-7"
              />
            ) : (
              <HugeiconsIcon
                icon={Menu01Icon}
                className="cursor-pointer size-7"
              />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg z-40 flex flex-col items-center justify-center md:hidden px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex flex-col gap-8 text-center">
              {[
                { name: 'Features', id: 'features' },
                { name: 'How it works', id: 'how-it-works' },
                { name: 'Pricing', id: 'pricing' }
              ].map((link) => (
                <a
                  key={link.name}
                  href={`#${link.id}`}
                  className="text-3xl sm:text-4xl font-display font-bold text-text-primary hover:text-brand transition-colors"
                  onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); scrollToSection(link.id) }}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-4 mt-8">
                {WAITLIST_MODE ? (
                  <Button
                    render={
                      <a
                        href="#waitlist"
                        onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); scrollToSection('waitlist') }}
                      />
                    }
                    className="text-base sm:text-xl py-3 sm:py-4 bg-brand text-bg font-semibold rounded-lg transition-all hover:brightness-110 active:scale-95"
                  >
                    Join the waitlist
                  </Button>
                ) : (
                  <Button
                    render={
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                      />
                    }
                    className="text-base sm:text-xl py-3 sm:py-4 bg-brand text-bg font-semibold rounded-lg transition-all hover:brightness-110 active:scale-95"
                  >
                    Get started free
                  </Button>
                )}
                <Button
                  render={
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  }
                  variant="outline"
                  className="text-base sm:text-xl py-3 sm:py-4 flex items-center justify-center gap-2 border-ghost-border bg-transparent text-text-primary font-medium rounded-lg transition-all hover:bg-ghost-bg active:scale-95"
                >
                  <HugeiconsIcon icon={GithubIcon} size={24} />
                  GitHub
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
