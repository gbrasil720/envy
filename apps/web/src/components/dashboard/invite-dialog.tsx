'use client'

import { Dialog, DialogContent, DialogTitle } from '@envy/ui/components/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function InviteDialog({ open, onOpenChange, projectId }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')

  const inviteMutation = useMutation(
    trpc.members.invite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.members.pending.queryOptions({ projectId })
        )
        onOpenChange(false)
        setInviteEmail('')
        setInviteRole('member')
      }
    })
  )

  const canSend = !!inviteEmail.trim() && !inviteMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-md border-ghost-border bg-[#0e0f0e] p-0 shadow-md sm:max-w-[440px]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <DialogTitle className="font-mono text-[10px] font-normal tracking-[0.1em] text-text-muted">
            INVITE MEMBER
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded border border-ghost-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted transition-colors hover:text-text-primary"
          >
            esc
          </button>
        </div>

        <div className="px-5 pt-6 pb-5">
          <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.015em] text-text-primary">
            Invite to the project
            <span className="text-brand">.</span>
          </h2>
          <p className="mb-5 text-[12.5px] leading-[1.6] text-text-secondary">
            They&apos;ll get access to secrets based on the role you pick.
          </p>

          <label
            htmlFor="invite-email"
            className="mb-1.5 block font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase"
          >
            EMAIL
          </label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="mb-4 w-full rounded border border-input bg-surface-2 px-3 py-2.5 font-mono text-[13px] text-text-primary outline-none focus:border-border-focus"
          />

          <div className="mb-1.5 font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
            ROLE
          </div>
          <div className="flex gap-2">
            {(['member', 'admin'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setInviteRole(role)}
                className={`flex-1 cursor-pointer rounded border px-3 py-2 font-mono text-[12px] transition-colors ${
                  inviteRole === role
                    ? 'border-ghost-border bg-ghost-bg text-text-primary'
                    : 'border-ghost-border text-text-muted hover:text-text-secondary'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-text-muted">
            {inviteRole === 'member'
              ? 'can view and pull secrets'
              : 'can manage secrets and invite members'}
          </p>
          {inviteMutation.isError ? (
            <p className="mt-3 text-[12px] text-danger">
              {inviteMutation.error.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer px-2.5 py-2 text-[12.5px] text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() =>
              inviteMutation.mutate({
                projectId,
                email: inviteEmail,
                role: inviteRole
              })
            }
            className={`rounded px-4 py-2 text-[12.5px] font-semibold transition-colors ${
              canSend
                ? 'cursor-pointer bg-primary text-primary-foreground hover:bg-white'
                : 'cursor-not-allowed bg-primary/15 text-text-muted'
            }`}
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send invite →'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
