import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import { CodeIcon, GithubIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const GITHUB_URL = 'https://github.com/envyapp/envy'

const MotionCard = motion.create(Card)

export function OpenSource() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden"
    >
      <div className="max-w-7xl w-full min-w-0 mx-auto">
        <MotionCard
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-surface border border-border rounded-[2rem] relative overflow-hidden ring-0 gap-0 py-0"
        >
          <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-brand/5 to-transparent pointer-events-none" />
          <CardContent className="p-6 sm:p-8 md:p-16">
            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.15, duration: 0.45 }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold mb-6 border border-brand/20"
                >
                  <HugeiconsIcon icon={GithubIcon} size={14} />
                  100% Open Source
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-3xl md:text-5xl font-display font-extrabold mb-6"
                >
                  Security you can audit.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3, duration: 0.45 }}
                  className="text-lg text-text-secondary mb-8 leading-relaxed"
                >
                  Secret management tools should be transparent. Envy is open
                  source from day one — read the encryption code, contribute to
                  the CLI, or run your own instance.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4, duration: 0.45 }}
                  className="flex flex-col sm:flex-row flex-wrap gap-4"
                >
                  <Button
                    render={
                      <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                    className="w-full sm:w-auto bg-brand text-bg font-semibold rounded-lg p-5 transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <HugeiconsIcon icon={GithubIcon} size={20} />
                    Star on GitHub
                  </Button>
                  <Button
                    render={
                      <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-bg hover:bg-brand"
                      />
                    }
                    className="w-full sm:w-auto bg-transparent border border-ghost-border text-text-primary font-medium rounded-lg p-5 transition-all hover:bg-ghost-bg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <HugeiconsIcon icon={CodeIcon} size={20} />
                    Read the source
                  </Button>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  delay: 0.3,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="dark bg-[#0D0D14] border border-white/10 rounded-2xl p-4 sm:p-6 font-mono text-xs sm:text-sm shadow-2xl overflow-x-auto"
              >
                <div className="flex items-center gap-2 mb-4 border-b border-ghost-divider pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-text-muted text-xs">
                    envy-cli / security / aes.ts
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-brand/60">
                    import{' '}
                    <span className="text-text-primary">
                      {'{ encrypt, decrypt }'}
                    </span>{' '}
                    {/** biome-ignore lint/suspicious/noSuspiciousSemicolonInJsx: <> */}
                    from <span className="text-brand">"./crypto"</span>;
                  </p>
                  <p className="text-brand/60">
                    export const{' '}
                    <span className="text-text-primary">secureVault</span> =
                    (secret: string) =&gt; {'{'}
                  </p>
                  <p className="pl-4 text-text-primary">
                    {' '}
                    const iv = crypto.randomBytes(16);
                  </p>
                  <p className="pl-4 text-text-primary">
                    {' '}
                    const cipher = crypto.createCipheriv('aes-256-gcm', key,
                    iv);
                  </p>
                  <p className="pl-4 text-text-primary">
                    {' '}
                    return Buffer.concat([iv, cipher.update(secret),
                    cipher.final()]);
                  </p>
                  <p className="text-brand/60">{'}'};</p>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </MotionCard>
      </div>
    </section>
  )
}
