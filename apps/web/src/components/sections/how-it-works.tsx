import { Badge } from '@envy/ui/components/badge'
import { Card, CardContent } from '@envy/ui/components/card'
import {
  Copy01Icon,
  CopyCheckIcon,
  TerminalIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'

const MotionCard = motion.create(Card)

const INSTALL_CMD = 'npm i -g useenvy@latest'

export function HowItWorks() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  const steps = [
    {
      step: 1,
      cmd: 'envy login',
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
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 border-y border-ghost-divider relative overflow-hidden scroll-mt-20"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(600px ellipse at 50% 40%, rgba(61, 214, 140, 0.05), transparent 70%)'
        }}
      />

      <div className="max-w-7xl w-full min-w-0 mx-auto relative z-10">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[32px] md:text-[48px] font-display font-semibold mb-6"
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

        {/* Install card — full-width, centered, one-time prerequisite */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            delay: 0.1,
            duration: 0.5,
            type: 'spring',
            stiffness: 100,
            damping: 15
          }}
          className="mb-6 relative w-full max-w-2xl mx-auto min-w-0"
        >
          {/* Attention pulse ring */}
          <motion.div
            className="absolute -inset-px rounded-xl pointer-events-none"
            animate={
              isInView && !reduceMotion
                ? {
                    boxShadow: [
                      '0 0 0 0px rgba(61, 214, 140, 0)',
                      '0 0 0 4px rgba(61, 214, 140, 0.12)',
                      '0 0 0 0px rgba(61, 214, 140, 0)'
                    ]
                  }
                : {}
            }
            transition={{
              delay: 1.4,
              duration: 2.2,
              repeat: reduceMotion ? 0 : Infinity,
              repeatDelay: 4
            }}
          />

          <MotionCard
            whileHover={{
              y: -3,
              transition: {
                duration: 0.25,
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
            className="bg-surface border border-brand/20 rounded-xl ring-0 gap-0 py-0 relative overflow-hidden transition-all duration-300 hover:border-brand/35 hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] cursor-default"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-brand/50 to-transparent pointer-events-none" />

            <CardContent className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 group">
              <div className="flex items-center gap-4 min-w-0 sm:shrink-0">
                <motion.div
                  animate={
                    isInView && !reduceMotion
                      ? {
                          boxShadow: [
                            '0 0 0 0px rgba(61, 214, 140, 0.35)',
                            '0 0 0 12px rgba(61, 214, 140, 0)',
                            '0 0 0 0px rgba(61, 214, 140, 0)'
                          ]
                        }
                      : {}
                  }
                  transition={{
                    delay: 0.8,
                    duration: 1.8,
                    repeat: reduceMotion ? 0 : Infinity,
                    repeatDelay: 3
                  }}
                  className="size-10 bg-brand/10 border border-brand/25 text-brand rounded-full flex items-center justify-center shrink-0"
                >
                  <HugeiconsIcon
                    icon={TerminalIcon}
                    size={16}
                    aria-hidden="true"
                  />
                </motion.div>

                <div className="flex flex-col items-start gap-1">
                  <Badge
                    variant="outline"
                    className="text-brand/80 bg-brand/10 border border-brand/20 px-2.5 py-0.5 tracking-widest rounded-sm"
                  >
                    One-time setup
                  </Badge>
                  <p className="text-[15px] font-semibold text-text-primary leading-snug">
                    Install the CLI
                  </p>
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    Install the CLI to get started.
                  </p>
                </div>
              </div>

              <div className="relative w-full min-w-0 sm:flex-1 sm:min-w-0">
                <div className="relative w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-lg [scrollbar-width:thin] sm:overflow-hidden">
                  <code className="relative z-10 flex w-full min-w-0 items-center justify-center bg-surface-2 dark:bg-[#0D0D14] border border-border dark:border-white/10 px-4 py-2.5 rounded-lg font-mono text-brand text-[13px] sm:text-sm transition-all duration-200 group-hover:border-brand/15 group-hover:border-2">
                    <span className="absolute left-3 text-text-muted" aria-hidden="true">
                      $
                    </span>
                    <span className="whitespace-nowrap">{INSTALL_CMD}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(INSTALL_CMD)}
                      aria-label="Copy install command to clipboard"
                      className="absolute right-3 text-text-muted hover:text-brand transition-colors duration-150 cursor-pointer"
                    >
                      <HugeiconsIcon
                        icon={
                          copiedCmd === INSTALL_CMD
                            ? CopyCheckIcon
                            : Copy01Icon
                        }
                        size={14}
                        aria-hidden="true"
                      />
                    </button>
                  </code>
                  <motion.div
                    className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        'linear-gradient(105deg, transparent 40%, rgba(61, 214, 140, 0.07) 50%, transparent 60%)'
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
              </div>
            </CardContent>
          </MotionCard>
        </motion.div>

        {/* Connector to steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex justify-center mb-6"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-4 bg-linear-to-b from-brand/30 to-brand/10" />
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '5px solid rgba(61, 214, 140, 0.25)'
              }}
            />
          </div>
        </motion.div>

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
                    <code className="relative z-10 bg-surface-2 dark:bg-[#0D0D14] border border-border dark:border-white/10 px-4 py-2.5 rounded-lg font-mono text-brand text-sm flex items-center justify-center transition-all duration-200 group-hover:border-brand/15 group-hover:border-2">
                      <span className="absolute left-3 text-text-muted">$</span>
                      {item.cmd}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.cmd)}
                        aria-label={`Copy ${item.cmd} to clipboard`}
                        className="absolute right-3 text-text-muted hover:text-brand transition-colors duration-150 cursor-pointer"
                      >
                        <HugeiconsIcon
                          icon={
                            copiedCmd === item.cmd ? CopyCheckIcon : Copy01Icon
                          }
                          size={14}
                          aria-hidden="true"
                        />
                      </button>
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
