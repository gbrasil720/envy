'use client'

import { Dialog, DialogContent, DialogTitle } from '@envy/ui/components/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

export function InviteDialog({ open, onOpenChange, organizationId }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [createdInvite, setCreatedInvite] = useState<{
    email: string
    role: 'admin' | 'member'
  } | null>(null)

  const inviteMutation = useMutation(
    trpc.members.invite.mutationOptions({
      onSuccess: async (_, variables) => {
        setCreatedInvite({
          email: variables.email,
          role: variables.role
        })
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.members.invitations.queryKey({ organizationId })
          }),
          queryClient.invalidateQueries({ queryKey: ['auditLog:list'] })
        ])
      }
    })
  )

  const canSend = !!inviteEmail.trim() && !inviteMutation.isPending
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setInviteEmail('')
      setInviteRole('member')
      setCreatedInvite(null)
      inviteMutation.reset()
    }
    onOpenChange(nextOpen)
  }
  const inviteAnother = () => {
    setInviteEmail('')
    setInviteRole('member')
    setCreatedInvite(null)
    inviteMutation.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-md border-ghost-border bg-[#0e0f0e] p-0 shadow-md sm:max-w-[440px]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <DialogTitle className="font-mono text-[10px] font-normal tracking-[0.1em] text-text-muted">
            {createdInvite ? 'INVITATION CREATED' : 'INVITE MEMBER'}
          </DialogTitle>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="cursor-pointer rounded border border-ghost-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted transition-colors hover:text-text-primary"
          >
            esc
          </button>
        </div>

        {createdInvite ? (
          <>
            <div className="px-5 pt-6 pb-5">
              <div className="mb-5 flex size-9 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-sm text-brand">
                ✓
              </div>
              <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.015em] text-text-primary">
                Invite created
                <span className="text-brand">.</span>
              </h2>
              <p className="text-[12.5px] leading-[1.6] text-text-secondary">
                The invitation for{' '}
                <span className="font-mono text-text-primary">
                  {createdInvite.email}
                </span>{' '}
                is ready. Its secure link is valid for 48 hours.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded border border-ghost-border bg-ghost-border">
                <div className="bg-surface-2 px-3 py-2.5">
                  <span className="block font-mono text-[9px] tracking-[0.08em] text-text-muted">
                    ROLE
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-text-primary">
                    {createdInvite.role}
                  </span>
                </div>
                <div className="bg-surface-2 px-3 py-2.5">
                  <span className="block font-mono text-[9px] tracking-[0.08em] text-text-muted">
                    STATUS
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-brand">
                    pending
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5">
              <button
                type="button"
                onClick={inviteAnother}
                className="cursor-pointer px-2.5 py-2 text-[12.5px] text-text-secondary transition-colors hover:text-text-primary"
              >
                Invite another
              </button>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer rounded bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-white"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 pt-6 pb-5">
              <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.015em] text-text-primary">
                Invite to the organization
                <span className="text-brand">.</span>
              </h2>
              <p className="mb-5 text-[12.5px] leading-[1.6] text-text-secondary">
                They&apos;ll get access to this organization and its projects
                based on the role you pick.
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
                onChange={(event) => setInviteEmail(event.target.value)}
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
                  : 'can manage projects, secrets, and members'}
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
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer px-2.5 py-2 text-[12.5px] text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSend}
                onClick={() =>
                  inviteMutation.mutate({
                    organizationId,
                    email: inviteEmail.trim(),
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
