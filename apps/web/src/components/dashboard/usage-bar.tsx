export function UsageBar({
  label,
  used,
  limit
}: {
  label: string
  used: number
  limit: number | null
}) {
  const isUnlimited = limit === null
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = !isUnlimited && pct >= 80

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={isNearLimit ? 'text-amber-400' : 'text-foreground'}>
          {isUnlimited ? (
            <span className="text-brand">Unlimited</span>
          ) : (
            `${used} / ${limit}`
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-amber-400' : 'bg-brand'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
