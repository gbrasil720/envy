import { motion, useReducedMotion } from 'motion/react'

const REVEAL_EASE = [0.23, 1, 0.32, 1] as const

export function Features() {
  const reduce = useReducedMotion()

  return (
    <section
      id="features"
      className="mx-auto max-w-7xl scroll-mt-16 border-x border-b border-border"
    >
      <div className="px-6 pt-14 pb-10 sm:px-10 sm:pt-16 sm:pb-12">
        <p className="mb-4 font-mono text-[11px] text-text-muted">
          02 / WHAT YOU GET
        </p>
        <h2 className="max-w-[560px] text-[28px] leading-[1.08] font-bold tracking-[-0.02em] text-text-primary sm:text-[36px]">
          Ship faster. Leak nothing
          <span className="text-brand">.</span>
        </h2>
      </div>

      <div className="grid border-t border-border md:grid-cols-2">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.3, delay: 0 * 0.04, ease: REVEAL_EASE }}
          className="border-b border-border px-6 py-9 sm:px-10 md:border-r"
        >
          <h3 className="mb-1.5 text-[17px] font-semibold text-text-primary">
            Runtime injection
          </h3>
          <p className="mb-5 text-[13.5px] leading-[1.6] text-text-secondary">
            Works with any stack — Node, Python, Go, Ruby. No SDK in your
            project.
          </p>
          <div className="rounded border border-border bg-surface px-5 py-4 font-mono text-[12.5px] leading-[1.9]">
            <div>
              <span className="text-text-muted">$ </span>envy run -- node
              server.js
            </div>
            <div className="text-text-secondary">
              ▶ injecting 12 secrets into process…
            </div>
            <div className="text-brand">▶ starting server on :3000</div>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.3, delay: 1 * 0.04, ease: REVEAL_EASE }}
          className="border-b border-border px-6 py-9 sm:px-10"
        >
          <h3 className="mb-1.5 text-[17px] font-semibold text-text-primary">
            Environment diff
          </h3>
          <p className="mb-5 text-[13.5px] leading-[1.6] text-text-secondary">
            See exactly what&apos;s missing in production before you deploy —
            not after.
          </p>
          <div className="rounded border border-border bg-surface font-mono text-[12px]">
            <div className="grid grid-cols-[1.6fr_.7fr_.7fr] border-b border-ghost-divider px-4 py-2 text-[10px] tracking-[0.08em] text-text-muted">
              <span>SECRET</span>
              <span>STG</span>
              <span>PRD</span>
            </div>
            <div className="grid grid-cols-[1.6fr_.7fr_.7fr] border-b border-ghost-divider px-4 py-2">
              <span>DATABASE_URL</span>
              <span className="text-brand">✓</span>
              <span className="text-brand">✓</span>
            </div>
            <div className="grid grid-cols-[1.6fr_.7fr_.7fr] border-b border-ghost-divider px-4 py-2">
              <span>REDIS_URL</span>
              <span className="text-brand">✓</span>
              <span className="text-[10px] text-danger">MISSING</span>
            </div>
            <div className="grid grid-cols-[1.6fr_.7fr_.7fr] px-4 py-2">
              <span>NEW_FLAG</span>
              <span className="text-brand">✓</span>
              <span className="text-[10px] text-danger">MISSING</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.3, delay: 2 * 0.04, ease: REVEAL_EASE }}
          className="border-b border-border px-6 py-9 sm:px-10 md:border-r md:border-b-0"
        >
          <h3 className="mb-1.5 text-[17px] font-semibold text-text-primary">
            Audit log
          </h3>
          <p className="mb-5 text-[13.5px] leading-[1.6] text-text-secondary">
            Who changed what, and when. Every read of production is on the
            record.
          </p>
          <div className="font-mono text-[12px] leading-[1.5]">
            <div className="flex justify-between border-b border-ghost-divider py-2">
              <span>
                <span className="text-text-primary">maria</span>{' '}
                <span className="text-text-muted">changed</span> DATABASE_URL
              </span>
              <span className="text-text-muted">2h</span>
            </div>
            <div className="flex justify-between border-b border-ghost-divider py-2">
              <span>
                <span className="text-text-primary">ci-runner</span>{' '}
                <span className="text-text-muted">pulled</span> [production]
              </span>
              <span className="text-text-muted">3h</span>
            </div>
            <div className="flex justify-between py-2">
              <span>
                <span className="text-text-primary">joão</span>{' '}
                <span className="text-text-muted">added</span> REDIS_URL
              </span>
              <span className="text-text-muted">1d</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.3, delay: 3 * 0.04, ease: REVEAL_EASE }}
          className="px-6 py-9 sm:px-10"
        >
          <h3 className="mb-1.5 text-[17px] font-semibold text-text-primary">
            Encryption we can&apos;t undo
          </h3>
          <p className="mb-5 text-[13.5px] leading-[1.6] text-text-secondary">
            AES-256-GCM per project, master keys wrapped server-side. Your
            values are unreadable to us — by design, not policy.
          </p>
          <div className="flex items-center gap-3 font-mono text-[12px] text-text-secondary">
            <span>secret</span>
            <span className="flex-1 border-t border-dashed border-ghost-border" />
            <span className="rounded-full border border-ghost-border px-2.5 py-1 text-text-primary">
              AES-256-GCM
            </span>
            <span className="flex-1 border-t border-dashed border-ghost-border" />
            <span className="text-brand">ciphertext</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
