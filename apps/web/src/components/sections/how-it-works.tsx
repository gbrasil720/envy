import { Card, CardContent } from '@envy/ui/components/card'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

const MotionCard = motion.create(Card)

export function HowItWorks() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const steps = [
    {
      step: 1,
      cmd: 'npx envy login',
      desc: 'Authenticate once with GitHub'
    },
    {
      step: 2,
      cmd: 'envy init',
      desc: 'Connect your project to an environment'
    },
    {
      step: 3,
      cmd: 'envy pull',
      desc: 'Your whole team pulls the latest secrets instantly'
    }
  ]

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: 0.15 + i * 0.15,
        duration: 0.5,
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    })
  }

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 border-y border-ghost-divider relative overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(600px ellipse at 50% 40%, rgba(61, 214, 140, 0.05), transparent 70%)'
        }}
      />

      <div className="max-w-7xl w-full min-w-0 mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[32px] md:text-[48px] font-display font-extrabold mb-6"
          >
            Up and running in{' '}
            <span className="relative inline-block">
              <span className="relative z-10">3 commands</span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-brand/40 origin-left rounded-full"
              />
            </span>
            .
          </motion.h2>
        </div>

        <div className="relative">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-10 left-[15%] right-[15%] h-px hidden md:block z-0 origin-left"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(61, 214, 140, 0.3), rgba(61, 214, 140, 0.3), transparent)'
            }}
          />

          <div className="grid md:grid-cols-3 gap-8 md:gap-10 relative z-10">
            {steps.map((item, i) => (
              <MotionCard
                key={item.step}
                custom={i}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                variants={cardVariants}
                whileHover={{
                  y: -3,
                  transition: {
                    duration: 0.25,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20
                  }
                }}
                className="bg-surface border border-border rounded-xl transition-all duration-300 hover:border-brand/20 hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] cursor-default ring-0 gap-0 py-0"
              >
                <CardContent className="p-8 flex flex-col items-center text-center group">
                  <div className="relative mb-6">
                    <motion.div
                      animate={
                        isInView && !reduceMotion
                          ? {
                              boxShadow: [
                                '0 0 0 0px rgba(61, 214, 140, 0.3)',
                                '0 0 0 12px rgba(61, 214, 140, 0)',
                                '0 0 0 0px rgba(61, 214, 140, 0)'
                              ]
                            }
                          : {}
                      }
                      transition={{
                        delay: 0.5 + i * 0.2,
                        duration: 1.8,
                        repeat: reduceMotion ? 0 : Infinity,
                        repeatDelay: 2.5
                      }}
                      className="size-10 bg-brand text-bg rounded-full flex items-center justify-center font-bold shadow-brand"
                    >
                      {item.step}
                    </motion.div>
                  </div>

                  <div className="relative overflow-hidden rounded-lg mb-4 w-full">
                    <code className="dark relative z-10 bg-[#0D0D14] border border-white/10 px-4 py-2.5 rounded-lg font-mono text-brand text-sm block transition-all duration-200 group-hover:border-brand/15 group-hover:border-2">
                      <span className="text-text-muted mr-1">$</span> {item.cmd}
                    </code>
                    <motion.div
                      className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background:
                          'linear-gradient(105deg, transparent 40%, rgba(61, 214, 140, 0.06) 50%, transparent 60%)'
                      }}
                      animate={
                        reduceMotion ? undefined : { x: ['-100%', '200%'] }
                      }
                      transition={{
                        duration: 2,
                        repeat: reduceMotion ? 0 : Infinity,
                        repeatDelay: 1,
                        ease: 'linear'
                      }}
                    />
                  </div>

                  <p className="text-[15px] text-text-secondary leading-relaxed transition-colors duration-200 group-hover:text-text-primary/80">
                    {item.desc}
                  </p>
                </CardContent>
              </MotionCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
