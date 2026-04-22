'use client'

import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import {
  AlertCircleIcon,
  Cancel01Icon,
  GithubIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { authClient } from '@/lib/auth-client'

const MotionCard = motion.create(Card)

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>('')
  const navigate = useNavigate()

  const handleGithubLogin = async () => {
    setIsLoading(true)

    authClient.signIn
      .social({
        provider: 'github'
      })
      .then((data) => {
        if (data.error) {
          setError(data.error.message)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <div className="relative z-10 w-full max-w-[420px] px-6 md:px-0">
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0 overflow-hidden relative"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="absolute top-0 left-0 right-0 bg-danger/10 border-l-[3px] border-danger overflow-hidden"
            >
              <div className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-danger text-[13px] font-medium">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={14}
                    className="shrink-0"
                  />
                  <span className="break-all">{error}</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setError('')}
                  className="text-danger/60 hover:text-danger transition-colors shrink-0"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardContent
          className={`p-10 md:p-12 ${error ? 'mt-8' : ''} transition-all duration-300`}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-8 h-8 text-brand mb-3">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
                <span className="text-bg font-mono font-bold text-lg">
                  {'{}'}
                </span>
              </div>
            </div>
            <h1 className="font-display font-bold text-[22px] text-text-primary tracking-tight">
              envy
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-[26px] md:text-[32px] text-text-primary mb-2 tracking-tight leading-tight">
              Welcome back.
            </h2>
            <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
              Authenticate with GitHub to access your secrets.
            </p>
          </div>

          <Button
            onClick={handleGithubLogin}
            disabled={isLoading}
            className={`w-full h-12 bg-surface-2 border border-ghost-border rounded-[10px] flex items-center justify-center gap-[10px] transition-all duration-200 group relative overflow-hidden ${isLoading ? 'opacity-70 pointer-events-none' : 'hover:bg-ghost-bg-hover hover:border-brand/30 active:scale-[0.99]'}`}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                <span className="font-sans font-medium text-[15px] text-text-primary">
                  Connecting to GitHub...
                </span>
              </div>
            ) : (
              <>
                <HugeiconsIcon
                  icon={GithubIcon}
                  size={20}
                  className="text-white"
                />
                <span className="font-sans font-medium text-[15px] text-text-primary">
                  Continue with GitHub
                </span>
              </>
            )}
          </Button>
        </CardContent>
      </MotionCard>

      <div className="mt-8 flex flex-col items-center gap-6">
        <p className="font-sans text-[12px] text-text-muted text-center leading-relaxed">
          By continuing, you agree to our{' '}
          <Link
            to="/"
            className="text-text-secondary underline decoration-ghost-divider underline-offset-4 hover:text-brand transition-colors"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            to="/"
            className="text-text-secondary underline decoration-ghost-divider underline-offset-4 hover:text-brand transition-colors"
          >
            Privacy Policy
          </Link>
        </p>

        <Button
          onClick={() => navigate({ to: '/' })}
          variant="ghost"
          className="font-sans text-[13px] text-text-secondary hover:text-brand transition-colors flex items-center gap-2"
        >
          ← Back to homepage
        </Button>
      </div>
    </div>
  )
}
