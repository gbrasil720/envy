import { Button } from '@envy/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@envy/ui/components/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@envy/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@envy/ui/components/input-group'
import { ToggleGroup, ToggleGroupItem } from '@envy/ui/components/toggle-group'
import { Mail01Icon } from '@hugeicons/core-free-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <FieldGroup className="py-2">
          <Field data-invalid={inviteMutation.isError ? true : undefined}>
            <FieldLabel htmlFor="invite-email">Email</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <DashboardIcon
                  icon={Mail01Icon}
                  size="md"
                  className="opacity-50"
                />
              </InputGroupAddon>
              <InputGroupInput
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                autoFocus
                aria-invalid={inviteMutation.isError}
              />
            </InputGroup>
            {inviteMutation.isError ? (
              <FieldError>{inviteMutation.error.message}</FieldError>
            ) : (
              <FieldDescription>
                Invitations require the Team plan in production.
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <ToggleGroup
              value={[inviteRole]}
              onValueChange={(groupValue) => {
                const v = groupValue[0]
                if (v === 'admin' || v === 'member') setInviteRole(v)
              }}
              variant="outline"
              size="sm"
              className="w-full justify-stretch"
            >
              <ToggleGroupItem value="member" className="flex-1">
                Member
              </ToggleGroupItem>
              <ToggleGroupItem value="admin" className="flex-1">
                Admin
              </ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              {inviteRole === 'member'
                ? 'Can view and pull secrets.'
                : 'Can manage secrets and invite members.'}
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              inviteMutation.mutate({
                projectId,
                email: inviteEmail,
                role: inviteRole
              })
            }
            disabled={inviteMutation.isPending || !inviteEmail.trim()}
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
