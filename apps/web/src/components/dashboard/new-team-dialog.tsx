import { Dialog, DialogContent, DialogTitle } from '@envy/ui/components/dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (organization: { slug: string }) => void
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NewTeamDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)

  async function createTeam() {
    const trimmedName = name.trim()
    const slug = slugify(trimmedName)
    if (!trimmedName || !slug) return

    setPending(true)
    const result = await authClient.organization.create({
      name: trimmedName,
      slug
    })
    setPending(false)

    if (result.error || !result.data) {
      toast.error(result.error?.message ?? 'Could not create team')
      return
    }

    setName('')
    onOpenChange(false)
    onCreated(result.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-md border-ghost-border bg-[#0e0f0e] p-0 shadow-md sm:max-w-[440px]">
        <div className="border-b border-border px-5 py-3.5">
          <DialogTitle className="font-mono text-[10px] font-normal tracking-[0.1em] text-text-muted">
            NEW TEAM
          </DialogTitle>
        </div>
        <div className="px-5 pt-6 pb-5">
          <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.015em] text-text-primary">
            Name your workspace<span className="text-brand">.</span>
          </h2>
          <p className="mb-5 text-[12.5px] leading-[1.6] text-text-secondary">
            Teams keep projects, members, and billing in one shared context.
          </p>
          <label
            htmlFor="new-team-name"
            className="mb-1.5 block font-mono text-[10px] tracking-[0.08em] text-text-muted"
          >
            TEAM NAME
          </label>
          <input
            id="new-team-name"
            autoFocus
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void createTeam()
            }}
            placeholder="acme inc"
            className="w-full rounded border border-input bg-surface-2 px-3 py-2.5 font-mono text-[13.5px] text-text-primary outline-none placeholder:text-text-muted focus:border-border-focus"
          />
        </div>
        <div className="flex justify-end gap-2.5 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer px-2.5 py-2 text-[12.5px] text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !slugify(name)}
            onClick={() => void createTeam()}
            className="cursor-pointer rounded bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Creating…' : 'Create team →'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
