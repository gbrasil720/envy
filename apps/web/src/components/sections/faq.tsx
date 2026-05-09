import { Card, CardContent } from '@envy/ui/components/card'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { FAQItem } from '../faq-item'

const MotionCard = motion.create(Card)

const faqs = [
  {
    question: 'Can you read my secrets?',
    answer:
      "No. Your secrets are encrypted with AES-256-GCM before they leave your machine. We never see them in plain text — and neither does anyone who shouldn't."
  },
  {
    question: 'What happens if Envy goes down?',
    answer:
      'The CLI caches secrets locally in an encrypted vault. If our servers go down, your local and production environments keep running on cached values — no interruption to your work.'
  },
  {
    question: 'How is Envy different from Doppler or Infisical?',
    answer:
      "Doppler charges $21 per user, per month. Envy's Team plan is $19 flat for up to 5 people. We're also CLI-first — no complex dashboards, no YAML to wrestle with. Three commands and you're syncing."
  },
  {
    question: 'Can I self-host Envy?',
    answer:
      "Not yet — we're focused on making the cloud version excellent first. A self-hosted option is on the roadmap. If that's a hard requirement for you, reach out and we'll keep you posted."
  },
  {
    question: 'What happens when my team grows beyond 5 people?',
    answer:
      "Our Team plan covers up to 5 members. Growing past that? We have an Enterprise plan with custom pricing, SSO, and granular access controls. Reach out and we'll get you sorted."
  }
]

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      className="min-w-0 py-14 sm:py-20 md:py-28 px-4 sm:px-6 bg-bg"
    >
      <div className="max-w-4xl w-full min-w-0 mx-auto">
        <MotionCard
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="min-w-0 bg-surface border border-border rounded-[2rem] shadow-2xl relative overflow-hidden ring-0 gap-0 py-0"
        >
          <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-brand/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-full grid-bg opacity-[0.02] pointer-events-none" />

          <CardContent className="min-w-0 p-6 sm:p-10 md:p-16 relative z-10">
            <div className="text-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-3xl sm:text-4xl md:text-5xl font-display font-semibold mb-6 tracking-tight"
              >
                Questions we get a lot.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-text-secondary text-lg"
              >
                Honest answers — no marketing fluff.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              {faqs.map((faq, i) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    delay: 0.35 + i * 0.08,
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                >
                  <FAQItem question={faq.question} answer={faq.answer} />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </MotionCard>
      </div>
    </section>
  )
}
