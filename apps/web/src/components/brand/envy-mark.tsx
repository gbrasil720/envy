import { cn } from '@envy/ui/lib/utils'

type EnvyMarkProps = {
  size?: number
  className?: string
  /** Use inverted mark (dark disc) for light backgrounds */
  onLight?: boolean
  title?: string
}

/**
 * Keyway mark — white disc / black keyway (7a / Brand Assets).
 * Inline SVG so it works at any size without asset round-trips.
 */
export function EnvyMark({
  size = 20,
  className,
  onLight = false,
  title = 'envy'
}: EnvyMarkProps) {
  const disc = onLight ? '#151614' : '#eeefee'
  const keyway = onLight ? '#f6f5f2' : '#0b0c0b'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="64" height="64" rx="32" fill={disc} />
      <circle cx="32" cy="26" r="10" fill={keyway} />
      <rect x="26" y="30" width="12" height="18" rx="3" fill={keyway} />
    </svg>
  )
}
