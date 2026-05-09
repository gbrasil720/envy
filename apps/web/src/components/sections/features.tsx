import {
  FileScriptIcon,
  LockIcon,
  Refresh01Icon,
  Shield01Icon,
  TerminalIcon,
  WorkHistoryIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { FeatureCard } from '../feature-card'

export function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      id="features"
      className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 scroll-mt-20"
    >
      <div className="max-w-7xl w-full min-w-0 mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[32px] md:text-[48px] font-display font-semibold mb-6 leading-tight"
          >
            Ship faster. <br />
            Leak nothing.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-[16px] text-text-secondary max-w-2xl mx-auto leading-[1.75]"
          >
            Inject secrets at runtime, track every change, and catch missing
            keys before they break production.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <FeatureCard
            icon={TerminalIcon}
            title="One command. All your secrets."
            description="Works with any stack. Node, Python, Ruby, Go. No SDK to install in your project."
            badge="Universal Compatibility"
            className="md:col-span-8"
          >
            <div className="bg-surface-2 dark:bg-[#0D0D14] p-6 rounded-xl border border-border dark:border-white/10 font-mono text-xs overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-brand">▶</span>
                <span className="text-text-primary max-w-full overflow-hidden whitespace-nowrap animate-typewriter inline-block">
                  $ envy run -- node server.js
                </span>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="text-brand"
              >
                ▶ 12 secrets injected · Starting on :3000
              </motion.div>
            </div>
          </FeatureCard>

          <FeatureCard
            icon={WorkHistoryIcon}
            title="Audit log"
            description="Know who changed what and when. Always."
            className="md:col-span-4"
          >
            <div className="space-y-4">
              {[
                {
                  user: 'Maria',
                  action: 'changed',
                  key: 'DATABASE_URL',
                  time: '2h ago'
                },
                {
                  user: 'João',
                  action: 'added',
                  key: 'REDIS_URL',
                  time: 'yesterday'
                },
                {
                  user: 'Sistema',
                  action: 'pulled',
                  key: '[production]',
                  time: '3h ago'
                }
              ].map((log) => (
                <div
                  key={log.key}
                  className="flex items-center gap-3 border-b border-ghost-divider pb-3 last:border-0"
                >
                  {/** biome-ignore lint/performance/noImgElement: <> */}
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${log.user}`}
                    width={24}
                    height={24}
                    alt="User"
                    className="rounded-full"
                  />
                  <div className="flex-1 text-[11px] font-mono">
                    <span className="text-brand">{log.user}</span>
                    <span className="text-text-muted mx-1">{log.action}</span>
                    <span className="text-text-primary">{log.key}</span>
                  </div>
                  <span className="text-[10px] text-text-muted whitespace-nowrap">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard
            icon={Refresh01Icon}
            title="Environment diff"
            description="See exactly what's missing in production before you deploy."
            className="md:col-span-4"
          >
            <div className="bg-surface-2 border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-[11px] font-mono min-w-[200px]">
                <thead>
                  <tr className="bg-ghost-bg text-text-muted">
                    <th className="px-3 py-2 text-left font-normal">SECRET</th>
                    <th className="px-3 py-2 text-center font-normal">STG</th>
                    <th className="px-3 py-2 text-center font-normal">PRD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ghost-divider">
                  <tr>
                    <td className="px-3 py-2 text-text-secondary">
                      DATABASE_URL
                    </td>
                    <td className="px-3 py-2 text-center text-brand">✓</td>
                    <td className="px-3 py-2 text-center text-brand">✓</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-text-secondary">REDIS_URL</td>
                    <td className="px-3 py-2 text-center text-brand">✓</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-danger/12 text-danger px-1 rounded-[2px] text-[9px]">
                        MISSING
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-text-secondary">NEW_FLAG</td>
                    <td className="px-3 py-2 text-center text-brand">✓</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-danger/12 text-danger px-1 rounded-[2px] text-[9px]">
                        MISSING
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FeatureCard>

          <FeatureCard
            icon={LockIcon}
            title="AES-256 Encryption"
            description="Encryption at rest. We can't read your secrets. Even if we wanted to."
            className="md:col-span-8"
          >
            <div className="py-4 md:py-8">
              <div className="flex flex-col items-center gap-0 sm:hidden">
                <div className="flex flex-col items-center gap-2">
                  <div className="size-12 bg-surface-2 border border-border rounded-full flex items-center justify-center text-text-secondary">
                    <HugeiconsIcon icon={FileScriptIcon} size={20} />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">
                    secret
                  </span>
                </div>
                <div
                  className="h-8 w-px shrink-0 border-l border-dashed border-brand/40"
                  aria-hidden
                />
                <div className="bg-brand-dim text-brand px-3 py-1 rounded-full text-[10px] font-bold border border-brand/20 whitespace-nowrap">
                  AES-256-GCM
                </div>
                <div
                  className="h-8 w-px shrink-0 border-l border-dashed border-brand/40"
                  aria-hidden
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="size-16 bg-brand-dim border border-brand/30 rounded-full flex items-center justify-center text-brand shadow-brand">
                    <HugeiconsIcon icon={LockIcon} size={24} />
                  </div>
                  <span className="text-[10px] text-brand font-mono font-bold">
                    ENCRYPTED
                  </span>
                </div>
                <div
                  className="h-8 w-px shrink-0 border-l border-dashed border-brand/40"
                  aria-hidden
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="size-12 bg-surface-2 border border-border rounded-full flex items-center justify-center text-text-secondary">
                    <HugeiconsIcon icon={Shield01Icon} size={20} />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">
                    database
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="size-12 bg-surface-2 border border-border rounded-full flex items-center justify-center text-text-secondary">
                    <HugeiconsIcon icon={FileScriptIcon} size={20} />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">
                    secret
                  </span>
                </div>
                <div className="flex flex-row items-center flex-1 gap-0">
                  <div className="h-px flex-1 border-t border-dashed border-brand/40" />
                  <div className="bg-brand-dim text-brand px-3 py-1 rounded-full text-[10px] font-bold border border-brand/20 whitespace-nowrap">
                    AES-256-GCM
                  </div>
                  <div className="h-px flex-1 border-t border-dashed border-brand/40" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-16 bg-brand-dim border border-brand/30 rounded-full flex items-center justify-center text-brand shadow-brand">
                    <HugeiconsIcon icon={LockIcon} size={24} />
                  </div>
                  <span className="text-[10px] text-brand font-mono font-bold">
                    ENCRYPTED
                  </span>
                </div>
                <div className="h-px w-6 flex-1 min-w-[1rem] border-t border-dashed border-brand/40" />
                <div className="flex flex-col items-center gap-2">
                  <div className="size-12 bg-surface-2 border border-border rounded-full flex items-center justify-center text-text-secondary">
                    <HugeiconsIcon icon={Shield01Icon} size={20} />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">
                    database
                  </span>
                </div>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}
