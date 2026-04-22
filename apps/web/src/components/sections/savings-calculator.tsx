import { Card, CardContent } from '@envy/ui/components/card'
import { motion, useInView } from 'motion/react'
import { useRef, useState } from 'react'

const MotionCard = motion.create(Card)

export function SavingsCalculator() {
  const [devs, setDevs] = useState(5)
  const dopplerPrice = 21
  const envyPrice = 19
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const monthlyDoppler = devs * dopplerPrice
  const monthlySavings = monthlyDoppler - envyPrice
  const yearlySavings = monthlySavings * 12

  return (
    <section
      ref={sectionRef}
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 bg-bg border-y border-ghost-divider"
    >
      <div className="max-w-4xl w-full min-w-0 mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-display font-extrabold mb-4"
          >
            Stop overpaying for security.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-text-secondary"
          >
            See how much you save by switching from Doppler to Envy.
          </motion.p>
        </div>

        <MotionCard
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            delay: 0.25,
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="bg-surface border border-border rounded-[2rem] shadow-2xl relative overflow-hidden ring-0 gap-0 py-0"
        >
          <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-brand/5 to-transparent pointer-events-none" />
          <CardContent className="p-8 md:p-12 relative z-10">
            <div className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <label htmlFor="devs-slider" className="text-lg font-bold">
                  Number of developers
                </label>
                <span className="text-3xl font-display font-bold text-brand">
                  {devs}
                </span>
              </div>
              <input
                id="devs-slider"
                type="range"
                min="1"
                max="10"
                value={devs}
                aria-label="Number of developers"
                aria-valuemin={1}
                aria-valuemax={10}
                aria-valuenow={devs}
                aria-valuetext={`${devs} developers`}
                onChange={(e) => setDevs(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-ghost-border rounded-lg appearance-none cursor-pointer accent-brand"
              />
              <div className="flex justify-between mt-2 text-xs text-text-muted font-mono">
                <span>1 DEV</span>
                <span>10 DEVS</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-ghost-bg rounded-xl border border-ghost-divider">
                  <span className="text-text-secondary">Doppler cost</span>
                  <span className="font-bold text-red-400">
                    ${monthlyDoppler}/mo
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-brand/10 rounded-xl border border-brand/20">
                  <span className="text-text-secondary">Envy cost (Team)</span>
                  <span className="font-bold text-brand">${envyPrice}/mo</span>
                </div>
              </div>

              <div className="text-center md:text-right">
                <p className="text-text-secondary text-sm uppercase tracking-widest mb-2">
                  Estimated Yearly Savings
                </p>
                <motion.p
                  key={yearlySavings}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  aria-live="polite"
                  className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-brand"
                >
                  ${yearlySavings.toLocaleString()}
                </motion.p>
                <p className="text-text-muted text-xs mt-4">
                  *Based on Doppler Team pricing of $21/user/mo
                </p>
              </div>
            </div>
          </CardContent>
        </MotionCard>
      </div>
    </section>
  )
}
