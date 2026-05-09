import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import { CancelCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'motion/react'

const MotionCard = motion.create(Card)

export function AuthorizationExpiredCard() {
  return (
    <MotionCard
      key="expired"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0"
    >
      <CardContent className="p-12 text-center">
        <div className="flex justify-center mb-8">
          <div className="size-20 bg-danger/10 rounded-full flex items-center justify-center text-danger">
            <HugeiconsIcon icon={CancelCircleIcon} size={40} />
          </div>
        </div>

        <h1 className="font-display font-semibold text-[24px] text-danger mb-2">
          Session expired
        </h1>
        <p className="text-text-secondary text-[15px] mb-8">
          This authorization request has expired. Run envy login again.
        </p>

        <div className="bg-danger/5 border border-danger/10 rounded-xl p-4 mb-8 font-mono text-[13px] text-text-secondary flex items-center gap-3 justify-center">
          <span className="text-danger">$</span>
          <span>envy login</span>
        </div>

        <Button className="w-full h-12 bg-surface-2 border border-border rounded-[10px] text-text-primary font-medium hover:bg-ghost-bg transition-all">
          Try again
        </Button>
      </CardContent>
    </MotionCard>
  )
}
