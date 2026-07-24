import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@envy/ui/components/alert-dialog'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@envy/ui/components/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatDateShort, timeAgoVerbose } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'

type Props = {
  organizationId: string
}

function InvitationStatus({ status }: { status: string }) {
  if (status === 'accepted') {
    return (
      <Badge className="font-mono text-[10px]" variant="default">
        accepted
      </Badge>
    )
  }

  if (status === 'pending') {
    return (
      <Badge className="font-mono text-[10px]" variant="outline">
        pending
      </Badge>
    )
  }

  if (status === 'expired') {
    return (
      <Badge className="font-mono text-[10px]" variant="secondary">
        expired
      </Badge>
    )
  }

  return (
    <Badge className="font-mono text-[10px]" variant="destructive">
      {status}
    </Badge>
  )
}

export function RecentInvitations({ organizationId }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [invitationToCancel, setInvitationToCancel] = useState<{
    id: string
    email: string
  } | null>(null)
  const queryOptions = trpc.members.invitations.queryOptions({
    organizationId
  })
  const invitationsQuery = useQuery(queryOptions)

  const reinviteMutation = useMutation(
    trpc.members.reinvite.mutationOptions({
      onSuccess: async (_, variables) => {
        const invitation = invitationsQuery.data?.find(
          (item) => item.id === variables.invitationId
        )
        toast.success(`A new invitation was created for ${invitation?.email}.`)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: ['auditLog:list'] })
        ])
      },
      onError: (error) => toast.error(error.message)
    })
  )

  const cancelMutation = useMutation(
    trpc.members.cancelInvite.mutationOptions({
      onSuccess: async () => {
        toast.success('Invitation canceled.')
        setInvitationToCancel(null)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: ['auditLog:list'] })
        ])
      },
      onError: (error) => toast.error(error.message)
    })
  )

  const invitations = invitationsQuery.data ?? []

  return (
    <section className="border-t border-border">
      <div className="flex items-start justify-between gap-4 border-b border-border px-7 py-4">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.08em] text-text-primary">
            RECENT INVITATIONS
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            Review the latest 25 invitations sent from this organization.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-text-muted">
          {invitations.length} record{invitations.length === 1 ? '' : 's'}
        </span>
      </div>

      {invitationsQuery.isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed loading rows
              key={index}
              className="grid grid-cols-4 gap-5 border-b border-ghost-divider px-7 py-4"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 justify-self-end" />
            </div>
          ))}
        </div>
      ) : invitationsQuery.isError ? (
        <div className="px-7 py-10 text-center">
          <p className="font-mono text-[11px] text-danger">
            Could not load invitations.
          </p>
          <Button
            className="mt-3 font-mono"
            size="sm"
            variant="outline"
            onClick={() => invitationsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : invitations.length === 0 ? (
        <div className="px-7 py-12 text-center">
          <p className="font-mono text-[11px] text-text-muted">
            no invitations sent yet
          </p>
        </div>
      ) : (
        <Table className="min-w-[840px]">
          <TableHeader>
            <TableRow className="border-ghost-divider hover:bg-transparent">
              <TableHead className="h-9 pl-7 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                INVITEE
              </TableHead>
              <TableHead className="h-9 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                ROLE
              </TableHead>
              <TableHead className="h-9 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                INVITED BY
              </TableHead>
              <TableHead className="h-9 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                SENT / EXPIRES
              </TableHead>
              <TableHead className="h-9 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                STATUS
              </TableHead>
              <TableHead className="h-9 pr-7 text-right font-mono text-[10px] tracking-[0.08em] text-text-muted">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow
                key={invitation.id}
                className="border-ghost-divider hover:bg-ghost-bg"
              >
                <TableCell className="max-w-64 pl-7 font-mono text-[11px] text-text-primary">
                  <span className="block truncate">{invitation.email}</span>
                </TableCell>
                <TableCell className="font-mono text-[10.5px] text-text-secondary">
                  {invitation.role}
                </TableCell>
                <TableCell>
                  <span className="block text-[12px] text-text-secondary">
                    {invitation.inviter.name || invitation.inviter.email}
                  </span>
                  {invitation.inviter.name ? (
                    <span className="block font-mono text-[9.5px] text-text-muted">
                      {invitation.inviter.email}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span className="block font-mono text-[10.5px] text-text-secondary">
                    {timeAgoVerbose(invitation.createdAt)}
                  </span>
                  <span className="block font-mono text-[9.5px] text-text-muted">
                    expires {formatDateShort(invitation.expiresAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <InvitationStatus status={invitation.status} />
                </TableCell>
                <TableCell className="pr-7 text-right">
                  {invitation.status === 'expired' ? (
                    <Button
                      className="font-mono"
                      disabled={reinviteMutation.isPending}
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        reinviteMutation.mutate({
                          invitationId: invitation.id
                        })
                      }
                    >
                      {reinviteMutation.isPending &&
                      reinviteMutation.variables?.invitationId === invitation.id
                        ? 'Sending…'
                        : 'Re-invite'}
                    </Button>
                  ) : invitation.status === 'pending' ? (
                    <Button
                      className="font-mono"
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        setInvitationToCancel({
                          id: invitation.id,
                          email: invitation.email
                        })
                      }
                    >
                      Cancel
                    </Button>
                  ) : (
                    <span className="font-mono text-[10px] text-text-muted">
                      —
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={invitationToCancel !== null}
        onOpenChange={(open) => {
          if (!open) setInvitationToCancel(null)
        }}
      >
        <AlertDialogContent className="rounded-md border-ghost-border bg-[#0e0f0e]">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel the invitation for{' '}
              <span className="font-mono text-text-primary">
                {invitationToCancel?.email}
              </span>
              ? Their current invitation link will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep invitation
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              disabled={cancelMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (invitationToCancel) {
                  cancelMutation.mutate({
                    invitationId: invitationToCancel.id
                  })
                }
              }}
            >
              {cancelMutation.isPending ? 'Canceling…' : 'Cancel invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
