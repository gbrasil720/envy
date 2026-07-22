import { createFileRoute } from '@tanstack/react-router'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { FAQ } from '@/components/sections/faq'
import { Features } from '@/components/sections/features'
import { FinalCta } from '@/components/sections/final-cta'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Pricing } from '@/components/sections/pricing'
import { ProofStrip } from '@/components/sections/proof-strip'
import { Waitlist } from '@/components/sections/waitlist'
import { WAITLIST_MODE } from '@/lib/env'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Secrets Manager for Developers — Envy' },
      {
        name: 'description',
        content:
          'Your production keys are sitting in Slack right now. envy moves them somewhere sane: encrypted at rest, synced by CLI, audited on every read. Free plan, teams from $19/month.'
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://useenvy.dev/' },
      {
        property: 'og:title',
        content: 'Envy — Stop Sharing .env Files on Slack'
      },
      {
        property: 'og:description',
        content:
          'Encrypted at rest, synced by CLI, audited on every read. Delete the pinned .env message forever. Start free — teams from $19/month.'
      },
      { property: 'og:image', content: 'https://useenvy.dev/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@useenvy' },
      {
        name: 'twitter:title',
        content: 'Envy — Stop Sharing .env Files on Slack'
      },
      {
        name: 'twitter:description',
        content:
          'Encrypted at rest, synced by CLI, audited on every read. Start free — teams from $19/month.'
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
  publisher: {
    '@type': 'Organization',
    name: 'Envy',
    url: 'https://useenvy.dev'
  }
}

function HomeComponent() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      <div className="min-h-svh min-w-0 max-w-full bg-bg text-text-primary">
        <Navbar />
        <Hero />
        <ProofStrip />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <FinalCta />
        {WAITLIST_MODE ? <Waitlist /> : null}
        <Footer />
      </div>
    </>
  )
}
