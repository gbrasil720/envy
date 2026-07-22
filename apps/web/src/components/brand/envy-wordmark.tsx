import { cn } from '@envy/ui/lib/utils'
import { EnvyMark } from './envy-mark'

type EnvyWordmarkProps = {
  className?: string
  markSize?: number
  /** Hide the keyway mark (text only) */
  markOnly?: boolean
  /** Text-only wordmark without the disc */
  textOnly?: boolean
  onLight?: boolean
}

/**
 * Wordmark: mark + envy* (green asterisk) — Brand Assets usage guide.
 */
export function EnvyWordmark({
  className,
  markSize = 20,
  markOnly = false,
  textOnly = false,
  onLight = false
}: EnvyWordmarkProps) {
  if (markOnly) {
    return <EnvyMark size={markSize} onLight={onLight} className={className} />
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[15px] font-semibold tracking-tight text-text-primary",
        className
      )}
    >
      {!textOnly ? <EnvyMark size={markSize} onLight={onLight} /> : null}
      <span>
        envy
        <span className="font-sans font-bold text-brand">*</span>
      </span>
    </span>
  )
}
