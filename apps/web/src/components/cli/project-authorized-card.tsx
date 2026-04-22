import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'motion/react'

const MotionCard = motion.create(Card)

export function ProjectAuthorizedCard() {
  return (
    <MotionCard
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0"
    >
      <CardContent className="p-6 sm:p-10 md:p-12 text-center">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center text-brand"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={40} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              transition={{ duration: 0.5, repeat: 1, repeatType: 'reverse' }}
              className="absolute inset-0 border-2 border-brand rounded-full"
            />
          </div>
        </div>

        <h1 className="font-display font-bold text-[28px] text-text-primary mb-2">
          CLI authorized!
        </h1>
        <p className="text-text-secondary text-[15px] mb-8">
          Your terminal is now connected to{' '}
          <span className="text-text-primary font-medium">my-saas</span>. You
          can close this tab.
        </p>

        <div className="bg-brand/5 border border-brand/10 rounded-xl p-6 mb-8 text-left">
          <p className="text-brand text-sm font-medium mb-3">
            The CLI received your credentials and is ready to use.
          </p>
          <div className="bg-bg/50 rounded-lg p-3 font-mono text-[13px] text-text-secondary flex flex-wrap items-center gap-2">
            <span className="text-brand">$</span>
            <span className="break-words min-w-0">
              envy pull{' '}
              <span className="text-text-muted">
                # run this to sync your secrets
              </span>
            </span>
          </div>
        </div>

        <Button
          variant="link"
          className="decoration-0 text-text-muted hover:text-brand transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Back to Dashboard
        </Button>
      </CardContent>
    </MotionCard>
  )
}
