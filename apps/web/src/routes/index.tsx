import { Button } from '@envy/ui/components/button'
import {
  ArrowRight01Icon,
  CreditCardIcon,
  GitBranchIcon,
  LockIcon,
  TerminalIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Footer } from '@/components/footer'
import { LeakCounter } from '@/components/leak-counter'
import { MeshBackground } from '@/components/mesh-background'
import { Navbar } from '@/components/navbar'
import { FAQ } from '@/components/sections/faq'
import { Features } from '@/components/sections/features'
import { HowItWorks } from '@/components/sections/how-it-works'
import { OpenSource } from '@/components/sections/open-source'
import { Pricing } from '@/components/sections/pricing'
import { SavingsCalculator } from '@/components/sections/savings-calculator'
import { SecurityRisks } from '@/components/sections/security-risks'
import { Waitlist } from '@/components/sections/waitlist'
import { TerminalDemo } from '@/components/terminal-demo'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Secrets Manager for Developers — Envy' },
      {
        name: 'description',
        content:
          'Stop sharing .env files on Slack. Envy syncs your secrets encrypted across every environment — AES-256, audit logs, team access. Free plan, teams from $19/month.'
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://useenvy.dev/' },
      { property: 'og:title', content: 'Envy — Stop Sharing .env Files on Slack' },
      {
        property: 'og:description',
        content:
          'Sync your .env secrets across every environment. AES-256 encrypted, audit logs, team permissions. Start free — teams from $19/month.'
      },
      { property: 'og:image', content: 'https://useenvy.dev/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@useenvy' },
      { name: 'twitter:title', content: 'Envy — Stop Sharing .env Files on Slack' },
      {
        name: 'twitter:description',
        content:
          'Sync your .env secrets across every environment. AES-256 encrypted, audit logs, team permissions. Start free — teams from $19/month.'
      },
      { name: 'twitter:image', content: 'https://useenvy.dev/og-image.png' },
      { tagName: 'link', rel: 'canonical', href: 'https://useenvy.dev/' },
      { name: 'robots', content: 'index, follow' }
    ]
  }),
  component: HomeComponent
})

const homeSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Envy',
  url: 'https://useenvy.dev',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web, macOS, Linux, Windows',
  description:
    'Secrets and environment variable management for indie hackers and small teams. CLI-first, AES-256 encryption, audit logs.',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '9',
      priceCurrency: 'USD',
      billingIncrement: 'monthly'
    },
    {
      '@type': 'Offer',
      name: 'Team',
      price: '19',
      priceCurrency: 'USD',
      billingIncrement: 'monthly'
    }
  ],
  publisher: { '@type': 'Organization', name: 'Envy', url: 'https://useenvy.dev' }
}

function HomeComponent() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      <motion.div
        key="landing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-w-0 max-w-full"
      >
      <MeshBackground className="overflow-x-hidden">
        <Navbar />

        <section className="relative w-full min-w-0 pt-[calc(96px+env(safe-area-inset-top))] pb-[80px] md:pt-[calc(132px+env(safe-area-inset-top))] md:pb-[120px] px-4 sm:px-6 overflow-hidden">
          <div className="max-w-7xl w-full min-w-0 mx-auto text-center relative z-10">
            <LeakCounter />

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[26px] sm:text-[44px] md:text-[72px] font-display font-extrabold tracking-tight mb-6 md:mb-8 leading-[1.1] sm:leading-[1.05] text-text-primary wrap-break-word"
            >
              Stop sharing .env files
              <br />
              <span className="relative inline-block overflow-hidden">
                on Slack.
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="absolute left-0 top-1/2 h-[4px] bg-danger/80 -rotate-2"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[17px] sm:text-[20px] md:text-[22px] font-normal text-text-secondary w-full max-w-[600px] mx-auto mb-8 md:mb-14 leading-[1.7] sm:leading-[1.85] tracking-[0.004em]"
            >
              One command syncs your secrets across every environment —
              encrypted, audited, and out of your team's chat history for good.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mb-8 w-full sm:w-auto max-w-full min-w-0"
            >
              <Button
                render={<Link to="/login" />}
                className="cursor-pointer bg-brand text-bg font-display font-bold rounded-xl transition-all hover:brightness-110 active:scale-[0.97] px-8 py-[18px] md:py-[20px] text-[16px] md:text-[17px] tracking-tight flex items-center justify-center gap-2.5 group shadow-[0_0_0_1px_rgba(61,214,140,0.2),0_6px_24px_rgba(61,214,140,0.1)]"
              >
                Get your free account
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '#how-it-works'
                }}
                className="cursor-pointer bg-ghost-bg border border-ghost-border text-text-primary font-medium rounded-xl transition-all hover:bg-ghost-bg-hover hover:border-border active:scale-[0.97] px-8 py-[18px] md:py-[20px] text-[16px] md:text-[17px] flex items-center justify-center gap-2.5"
              >
                <HugeiconsIcon
                  icon={TerminalIcon}
                  size={18}
                  className="text-text-primary"
                />
                See how it works
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-16"
            >
              {[
                { icon: LockIcon, text: 'AES-256 Encrypted' },
                { icon: GitBranchIcon, text: 'Open source CLI' },
                { icon: CreditCardIcon, text: 'No credit card required' }
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="bg-ghost-bg border border-ghost-divider text-text-secondary hover:text-text-primary hover:border-ghost-border transition-all px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider sm:tracking-widest uppercase flex items-center gap-1.5 whitespace-nowrap"
                >
                  <HugeiconsIcon icon={Icon} size={11} />
                  {text}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <TerminalDemo />
            </motion.div>
          </div>
        </section>

        <HowItWorks />

        <SecurityRisks />

        <Features />

        <SavingsCalculator />

        <OpenSource />

        <Pricing />

        <FAQ />

        <Waitlist />

        <Footer />
      </MeshBackground>
    </motion.div>
    </>
  )
}
