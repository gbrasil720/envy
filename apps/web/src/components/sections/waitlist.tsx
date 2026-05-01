import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import { WaitlistForm } from '../forms/waitlist-form'

export function Waitlist() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      id="waitlist"
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden scroll-mt-20"
    >
      <motion.div
        animate={
          isInView && !reduceMotion
            ? {
                scale: [1, 1.08, 1],
                opacity: [0.05, 0.09, 0.05]
              }
            : isInView
              ? { opacity: 0.07 }
              : { opacity: 0 }
        }
        transition={{
          duration: 6,
          repeat: reduceMotion ? 0 : Infinity,
          ease: 'easeInOut'
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[800px] sm:h-[800px] bg-brand blur-[80px] sm:blur-[120px] rounded-full pointer-events-none"
      />

      <div className="max-w-5xl w-full min-w-0 mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-linear-to-br from-surface to-bg border border-border rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-12 md:p-24 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-full grid-bg opacity-[0.03] pointer-events-none" />

          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              delay: 0.2,
              duration: 0.55,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="text-[26px] sm:text-5xl md:text-7xl font-display font-bold mb-6 md:mb-8 tracking-tight sm:tracking-tighter leading-[1.05] sm:leading-[0.95] md:leading-[0.9]"
          >
            Your .env belongs in Envy. <br />
            <motion.span
              initial={{ opacity: 0, x: -12 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{
                delay: 0.4,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="text-brand"
            >
              Not in Slack.
            </motion.span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-base sm:text-xl md:text-2xl text-text-secondary mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Secrets don't belong in Slack threads or forwarded emails. Join the
            list — be first in when we open the doors.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.65, duration: 0.45 }}
          >
            <WaitlistForm />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
