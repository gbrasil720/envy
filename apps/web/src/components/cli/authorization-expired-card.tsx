export function AuthorizationExpiredCard() {
  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-md border border-danger/35 bg-surface text-center">
      <div className="px-9 py-12">
        <div className="mb-4 font-mono text-[32px] text-danger">✕</div>
        <h1 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-text-primary">
          Session expired
        </h1>
        <p className="mb-6 text-[13px] leading-[1.6] text-text-secondary">
          This authorization request expired or was cancelled. Run the command
          again from your terminal.
        </p>
        <div className="rounded border border-ghost-border bg-surface-2 px-[18px] py-3.5 text-left font-mono text-[12px] leading-[1.9] text-text-secondary">
          <div>
            <span className="text-text-muted">$ </span>envy login
          </div>
          <div className="text-text-muted">← start a new session</div>
        </div>
      </div>
    </div>
  )
}
