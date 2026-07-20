const ITEMS = [
  { strong: 'AES-256-GCM', rest: ' at rest' },
  { strong: 'envy pull', rest: ' — one command sync' },
  { strong: 'every read', rest: ' hits the audit log' },
  { strong: 'diff envs', rest: ' before you deploy' }
] as const

export function ProofStrip() {
  return (
    <section className="mx-auto grid max-w-7xl border-x border-b border-border sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item, i) => (
        <div
          key={item.strong}
          className={`px-6 py-4 font-mono text-[11.5px] text-text-secondary sm:px-8 ${
            i < ITEMS.length - 1
              ? 'border-b border-border sm:border-b-0 lg:border-r'
              : ''
          } ${i % 2 === 0 && i < 2 ? 'sm:border-r' : ''} ${i === 1 ? 'sm:border-r-0 lg:border-r' : ''} ${i === 2 ? 'lg:border-r' : ''}`}
        >
          <span className="text-text-primary">{item.strong}</span>
          {item.rest}
        </div>
      ))}
    </section>
  )
}
