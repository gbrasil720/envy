import { Button } from '@envy/ui/components/button'
import { Card, CardContent, CardFooter } from '@envy/ui/components/card'
import { Tick01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { motion, useInView } from 'motion/react'
import { useRef, useState } from 'react'
import { WAITLIST_MODE } from '@/lib/env'
import { scrollToSection } from '@/lib/smooth-scroll'

const MotionCard = motion.create(Card)

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    desc: '1 project · 50 secrets',
    features: [
      '1 project',
      '50 secrets',
      '1 user',
      'Full CLI access',
      'Import/Export .env'
    ]
  },
  {
    name: 'Pro',
    price: '$9',
    desc: 'Unlimited projects · 1 user',
    features: [
      'Unlimited projects',
      'Unlimited secrets',
      '1 user',
      '90-day secret history',
      'Priority support',
      'Everything in Free'
    ]
  },
  {
    name: 'Team',
    price: '$19',
    desc: 'Up to 5 members',
    features: [
      'Unlimited projects',
      'Up to 5 members',
      'Full audit log',
      'Environment diff',
      'Member permissions',
      'Everything in Pro'
    ]
  }
]

function PricingWaitlist({ isInView }: { isInView: boolean }) {
  const [selected, setSelected] = useState(0)
  const plan = PLANS[selected]

  return (
    <div className="max-w-2xl mx-auto">
      <MotionCard
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{
          delay: 0.2,
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        className="border border-brand/40 bg-surface shadow-brand rounded-3xl gap-0 py-0"
      >
        <CardContent className="p-8 md:p-12 flex-1">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 bg-brand/20 text-brand text-[10px] font-bold uppercase rounded-full tracking-widest">
              Early Access
            </span>
            <h3 className="text-2xl md:text-3xl font-bold mt-4 mb-3">
              Pricing that grows with your team
            </h3>
            <p className="text-text-secondary max-w-md mx-auto">
              Start free and pay only when you need more. No credit card
              required, no surprise bills.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {PLANS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setSelected(i)}
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  selected === i
                    ? 'border-brand/50 bg-brand/5 shadow-sm shadow-brand/10'
                    : 'border-border bg-bg hover:border-border/80 hover:bg-surface'
                }`}
              >
                <div className="text-sm font-bold text-text-primary">
                  {p.name}
                </div>
                <div className="text-2xl font-bold mt-1">
                  {p.price}
                  <span className="text-xs text-text-muted font-normal">
                    /mo
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1 leading-tight">
                  {p.desc}
                </div>
              </button>
            ))}
          </div>

          <ul className="space-y-3">
            {plan.features.map((feat) => (
              <li
                key={feat}
                className="flex items-center gap-3 text-sm text-text-secondary"
              >
                <HugeiconsIcon
                  icon={Tick01Icon}
                  size={16}
                  className="text-brand shrink-0"
                />
                {feat}
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="border-t border-border px-8 pb-8 md:px-12 md:pb-12 pt-6 flex flex-col gap-3">
          <p className="text-center text-sm text-text-muted">
            Join the waitlist to lock in early-access pricing.
          </p>
          <Button
            render={
              <a
                href="#waitlist"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection('waitlist')
                }}
              />
            }
            className="bg-brand text-bg font-semibold rounded-lg px-5 py-2.5 transition-all hover:brightness-110 active:scale-95 w-full text-center"
          >
            Join the waitlist
          </Button>
        </CardFooter>
      </MotionCard>
    </div>
  )
}

function PricingFull({ isInView }: { isInView: boolean }) {
  return (
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
            <Button
              render={<Link to="/login" />}
              className="bg-transparent border border-ghost-border text-text-primary font-medium rounded-lg px-5 py-2.5 transition-all hover:border-border hover:bg-ghost-bg hover:text-bg active:scale-95 w-full"
            >
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
            <Button
              render={<Link to="/login" />}
              className="bg-brand text-bg font-semibold rounded-lg px-5 py-2.5 transition-all hover:brightness-110 active:scale-95 w-full"
            >
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
            <Button
              render={<Link to="/login" />}
              className="bg-transparent border border-ghost-border text-text-primary font-medium rounded-lg px-5 py-2.5 transition-all hover:border-border hover:bg-ghost-bg hover:text-bg active:scale-95 w-full"
            >
              Start Team trial
            </Button>
          </CardFooter>
        </MotionCard>
      </article>
    </div>
  )
}

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 bg-bg scroll-mt-20"
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
            {WAITLIST_MODE
              ? 'Plans are ready. Doors open soon.'
              : 'Start free today. Pay only when you need more.'}
          </motion.p>
        </div>

        {WAITLIST_MODE ? (
          <PricingWaitlist isInView={isInView} />
        ) : (
          <PricingFull isInView={isInView} />
        )}

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
