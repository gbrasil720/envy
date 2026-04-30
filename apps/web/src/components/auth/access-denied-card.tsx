'use client'

import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import {
  ArrowLeft01Icon,
  Mail01Icon,
  ShieldBanIcon,
  UserCheck01Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useNavigate } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'

const MotionCard = motion.create(Card)

export function AccessDeniedCard() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const handleTryDifferentAccount = () => {
    navigate({ to: '/login', search: {} })
  }

  return (
    <div className="relative z-10 w-full max-w-[420px] px-6 md:px-0">
      <MotionCard
        key="access-denied"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0 overflow-hidden relative"
      >
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-danger/50 to-transparent"
        />

        <CardContent className="p-8 sm:p-10 md:p-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-7 text-danger">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-danger animate-pulse"
            />
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase">
              access_denied
            </span>
          </div>

          <div className="flex justify-center mb-8">
            <div className="relative">
              <motion.div
                initial={reduceMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  damping: 14,
                  stiffness: 180,
                  delay: 0.1
                }}
                className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center text-danger relative z-10"
              >
                <HugeiconsIcon icon={ShieldBanIcon} size={40} />
              </motion.div>
              {!reduceMotion && (
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: [0, 0.5, 0],
                    scale: [0.85, 1.4, 1.6]
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeOut',
                    delay: 0.3
                  }}
                  className="absolute inset-0 border-2 border-danger/40 rounded-full"
                />
              )}
            </div>
          </div>

          <h1
            role="alert"
            className="font-display font-bold text-[24px] md:text-[26px] text-text-primary mb-3 tracking-tight leading-tight"
          >
            You're not on the list yet.
          </h1>
          <p className="font-sans text-[14px] md:text-[15px] text-text-secondary leading-relaxed mb-7 max-w-[320px] mx-auto">
            Envy is in private beta. Your GitHub account isn't approved for
            access — try another account or join the waitlist.
          </p>

          <div className="bg-surface-2/60 border border-ghost-border rounded-xl p-4 mb-8 font-mono text-[12px] text-left">
            <div className="flex flex-col gap-1.5 text-text-secondary">
              <span className="flex items-start gap-2">
                <span className="text-text-muted shrink-0 select-none">
                  {'//'}
                </span>
                <span>approvals are reviewed weekly</span>
              </span>
              <span className="flex items-start gap-2">
                <span className="text-brand shrink-0 select-none">→</span>
                <span>you'll be emailed when you're in</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleTryDifferentAccount}
              className="w-full h-12 bg-surface-2 border border-ghost-border rounded-[10px] text-text-primary font-medium hover:bg-ghost-bg-hover hover:border-brand/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <HugeiconsIcon icon={UserCheck01Icon} size={18} />
              <span>Try a different account</span>
            </Button>
            <a
              href="/#waitlist"
              className="h-11 rounded-[10px] flex items-center justify-center gap-2 text-text-secondary hover:text-brand transition-colors text-[13px] font-medium"
            >
              <HugeiconsIcon icon={Mail01Icon} size={16} />
              <span>Request early access</span>
            </a>
          </div>
        </CardContent>
      </MotionCard>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() => navigate({ to: '/' })}
          variant="ghost"
          className="font-sans text-[13px] text-text-secondary hover:text-brand transition-colors flex items-center gap-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          Back to homepage
        </Button>
      </div>
    </div>
  )
}
