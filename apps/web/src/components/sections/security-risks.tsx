import { Card, CardContent } from '@envy/ui/components/card'
import {
  Alert02Icon,
  FileCodeCornerFreeIcons,
  SlackIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

const MotionCard = motion.create(Card)

export function SecurityRisks() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const risks = [
    {
      icon: <HugeiconsIcon icon={SlackIcon} size={20} />,
      title: 'Slack Sharing',
      desc: 'Your Slack DMs are searchable. So is every API key your team ever pasted there.',
      mock: "Here's the .env file 🔑",
      type: 'slack'
    },
    {
      icon: <HugeiconsIcon icon={FileCodeCornerFreeIcons} size={20} />,
      title: 'Notion Docs',
      desc: 'That doc has your database password — and 14 people with edit access who have no business seeing it.',
      mock: 'API_KEY: sk_live_...',
      type: 'notion'
    },
    {
      icon: <HugeiconsIcon icon={Alert02Icon} size={20} />,
      title: 'Git Leaks',
      desc: 'One `git push` and your secret lives in commit history. Deleting the file afterwards does nothing.',
      mock: '+STRIPE_SECRET=sk_live_...',
      type: 'git'
    }
  ]

  return (
    <section
      ref={sectionRef}
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 bg-bg"
    >
      <div className="max-w-7xl w-full min-w-0 mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-display font-extrabold mb-6"
          >
            <span className="relative inline-block">
              Every team does this
              <motion.span
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-danger/60 origin-left rounded-full"
              />
            </span>
            . <br className="hidden md:block" />
            <span className="text-text-secondary">None of them should.</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {risks.map((item, i) => (
            <MotionCard
              key={item.type}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.2 + i * 0.12,
                duration: 0.45,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{
                scale: 1.02,
                transition: {
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20
                }
              }}
              className="bg-surface border border-border rounded-2xl overflow-hidden relative group cursor-default transition-shadow duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-0 gap-0 py-0"
            >
              <div className="absolute top-4 right-4 z-10">
                <span className="px-2.5 py-1 bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider border border-danger/20 rounded flex items-center gap-1.5">
                  <span className="relative flex size-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                    <span className="relative inline-flex rounded-full size-1.5 bg-danger" />
                  </span>
                  Security Risk
                </span>
              </div>

              <CardContent className="p-8 pb-0">
                <div className="relative mb-6">
                  <motion.div
                    whileHover={{
                      boxShadow: '0 0 0 8px rgba(255, 77, 77, 0.08)',
                      transition: { duration: 0.2 }
                    }}
                    className="size-10 bg-ghost-bg border border-border rounded-lg flex items-center justify-center text-text-secondary transition-colors duration-200 group-hover:text-danger group-hover:border-danger/20 group-hover:bg-danger/5"
                  >
                    {item.icon}
                  </motion.div>
                </div>

                <h3 className="text-xl font-bold mb-2 text-text-primary">
                  {item.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  {item.desc}
                </p>
              </CardContent>

              <div className="relative mx-4 mb-4 overflow-hidden rounded-lg">
                <div className="bg-surface-2 dark:bg-[#0D0D14]/90 border border-border dark:border-white/10 p-4 font-mono text-xs text-text-muted">
                  {item.mock}
                </div>
                <motion.div
                  className="absolute left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255, 77, 77, 0.4), transparent)'
                  }}
                  animate={
                    reduceMotion ? undefined : { top: ['0%', '100%', '0%'] }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: reduceMotion ? 0 : Infinity,
                    ease: 'linear'
                  }}
                />
              </div>
            </MotionCard>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-12 text-text-muted italic text-sm"
        >
          39% of security breaches start with exposed credentials. Most teams
          don't find out until it's too late.
        </motion.p>
      </div>
    </section>
  )
}
