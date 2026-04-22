import { Button } from '@envy/ui/components/button'
import { Card, CardContent, CardFooter } from '@envy/ui/components/card'
import { Tick01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const MotionCard = motion.create(Card)

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 bg-bg"
    >
      <div className="max-w-7xl w-full min-w-0 mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-display font-extrabold mb-4"
          >
            Simple pricing. Scales with your team.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-text-secondary"
          >
            Start free today. Pay only when you need more.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <article aria-labelledby="plan-free" className="contents">
            <MotionCard
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.2,
                duration: 0.45,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="bg-surface border border-border rounded-3xl transition-all duration-300 hover:border-brand/30 hover:shadow-brand relative ring-0 gap-0 py-0"
            >
              <CardContent className="p-8 md:p-10 flex-1">
                <h3 id="plan-free" className="text-lg font-bold mb-2">
                  Free
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-text-muted">/mo</span>
                </div>
                <ul className="space-y-4">
                  {[
                    '1 project',
                    '50 secrets',
                    '1 user',
                    'Full CLI access',
                    'Import/Export .env'
                  ].map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-3 text-sm text-text-secondary"
                    >
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={16}
                        className="text-brand"
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-0 px-8 pb-8 md:px-10 md:pb-10 pt-0">
                <Button className="bg-transparent border border-ghost-border text-text-primary font-medium rounded-lg px-5 py-2.5 transition-all hover:bg-ghost-bg active:scale-95 w-full">
                  Start for free
                </Button>
              </CardFooter>
            </MotionCard>
          </article>

          <article aria-labelledby="plan-pro" className="contents">
            <MotionCard
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.32,
                duration: 0.45,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="border rounded-3xl transition-all duration-300 hover:border-brand/30 hover:shadow-brand relative border-brand/40 bg-surface shadow-brand ring-0 gap-0 py-0"
            >
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-brand/20 text-brand text-[10px] font-bold uppercase rounded">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8 md:p-10 pt-12 md:pt-12 flex-1">
                <h3 id="plan-pro" className="text-lg font-bold mb-2">
                  Pro
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-text-muted">/mo</span>
                </div>
                <ul className="space-y-4">
                  {[
                    'Unlimited projects',
                    'Unlimited secrets',
                    '1 user',
                    'Everything in Free',
                    '90-day history',
                    'Priority support'
                  ].map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-3 text-sm text-text-secondary"
                    >
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={16}
                        className="text-brand"
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-0 px-8 pb-8 md:px-10 md:pb-10 pt-0">
                <Button className="bg-brand text-bg font-semibold rounded-lg px-5 py-2.5 transition-all hover:brightness-110 active:scale-95 w-full">
                  Start Pro trial
                </Button>
              </CardFooter>
            </MotionCard>
          </article>

          <article aria-labelledby="plan-team" className="contents">
            <MotionCard
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.44,
                duration: 0.45,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="bg-surface border border-border rounded-3xl transition-all duration-300 hover:border-brand/30 hover:shadow-brand relative ring-0 gap-0 py-0"
            >
              <CardContent className="p-8 md:p-10 flex-1">
                <h3 id="plan-team" className="text-lg font-bold mb-2">
                  Team
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-text-muted">/mo</span>
                </div>
                <ul className="space-y-4">
                  {[
                    'Unlimited projects',
                    'Up to 5 members',
                    'Full audit log',
                    'Environment diff',
                    'Member permissions',
                    'Everything in Pro'
                  ].map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-3 text-sm text-text-secondary"
                    >
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={16}
                        className="text-brand"
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-0 px-8 pb-8 md:px-10 md:pb-10 pt-0">
                <Button className="bg-transparent border border-ghost-border text-text-primary font-medium rounded-lg px-5 py-2.5 transition-all hover:bg-ghost-bg active:scale-95 w-full">
                  Start Team trial
                </Button>
              </CardFooter>
            </MotionCard>
          </article>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-12 text-text-muted text-sm"
        >
          No credit card required. Cancel anytime.
        </motion.p>
      </div>
    </section>
  )
}
