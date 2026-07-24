import { Button } from '@envy/ui/components/button'
import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

export function CopyValue({ label, value }: { label: string; value: string }) {
  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-ghost-divider py-3">
      <span className="font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
        {label}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <code className="truncate font-mono text-[11px] text-text-primary">
          {value}
        </code>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={copyValue}
          aria-label={`Copy ${label}`}
        >
          <CopyIcon />
        </Button>
      </span>
    </div>
  )
}
