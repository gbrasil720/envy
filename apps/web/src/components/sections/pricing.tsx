'use client'

import { Link } from '@tanstack/react-router'
import { WAITLIST_MODE } from '@/lib/env'
import { scrollToSection } from '@/lib/smooth-scroll'

type Plan = {
  name: string
  price: string
  desc: string
  tag?: string
  features: string
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'FREE',
    price: '$0',
    desc: 'For the side project',
    features:
      '1 project\n50 secrets\n1 user\nfull CLI access\nimport / export .env'
  },
  {
    name: 'PRO',
    price: '$9',
    desc: 'For the one shipping every week',
    tag: 'MOST POPULAR',
    popular: true,
    features:
      'unlimited projects\nunlimited secrets\n90-day history\npriority support\neverything in free'
  },
  {
    name: 'TEAM',
    price: '$19',
    desc: 'Up to 5 members',
    features:
      'up to 5 members\nfull audit log\nenvironment diff\nmember permissions\neverything in pro'
  }
]

function ctaLabel(plan: Plan) {
  if (WAITLIST_MODE) return 'Join waitlist'
  if (plan.name === 'FREE') return 'Start free'
  if (plan.name === 'PRO') return 'Start Pro trial'
  return 'Start Team trial'
}

export function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto max-w-7xl scroll-mt-16 border-x border-b border-border"
    >
      <div className="px-6 pt-14 pb-10 sm:px-10 sm:pt-16 sm:pb-12">
        <p className="mb-4 font-mono text-[11px] text-text-muted">
          03 / PRICING
        </p>
        <h2 className="text-[28px] leading-[1.08] font-bold tracking-[-0.02em] text-text-primary sm:text-[36px]">
          Free until it isn&apos;t a side project
          <span className="text-brand">.</span>
        </h2>
      </div>

      <div className="grid border-t border-border md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <div
            key={plan.name}
            className={`px-6 py-9 sm:px-10 ${
              i < PLANS.length - 1
                ? 'border-b border-border md:border-r md:border-b-0'
                : ''
            } ${plan.popular ? 'bg-ghost-bg' : ''}`}
          >
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-mono text-[12px] tracking-[0.08em] text-text-secondary">
                {plan.name}
              </span>
              {plan.tag ? (
                <span className="font-mono text-[10px] text-brand">
                  {plan.tag}
                </span>
              ) : null}
            </div>
            <div className="mb-0.5 text-[40px] font-bold tracking-[-0.02em] text-text-primary">
              {plan.price}
              <span className="text-[14px] font-normal text-text-muted">
                /mo
              </span>
            </div>
            <div className="mb-6 text-[12.5px] text-text-secondary">
              {plan.desc}
            </div>
            <div className="mb-7 whitespace-pre-line font-mono text-[12px] leading-[2.15] text-text-secondary">
              {plan.features}
            </div>
            {WAITLIST_MODE ? (
              <button
                type="button"
                onClick={() => scrollToSection('waitlist')}
                className={`block w-full cursor-pointer rounded py-3 text-center text-[13.5px] font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-white'
                    : 'border border-ghost-border text-text-primary hover:border-border-focus'
                }`}
              >
                {ctaLabel(plan)}
              </button>
            ) : (
              <Link
                to="/login"
                className={`block rounded py-3 text-center text-[13.5px] font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-white'
                    : 'border border-ghost-border text-text-primary hover:border-border-focus'
                }`}
              >
                {ctaLabel(plan)}
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border px-6 py-4 font-mono text-[11px] text-text-muted sm:px-10">
        no credit card required · cancel anytime · open-source CLI
      </div>
    </section>
  )
}
