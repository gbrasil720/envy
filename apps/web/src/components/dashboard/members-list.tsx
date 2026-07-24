import type { AppRouter } from '@envy/api/routers/index'
import { Alert, AlertDescription, AlertTitle } from '@envy/ui/components/alert'
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
import { Avatar, AvatarFallback, AvatarImage } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@envy/ui/components/dialog'
import { cn } from '@envy/ui/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import { useState } from 'react'
import { toast } from 'sonner'
import { initials } from '@/utils/initials'
import { formatDateShort } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'
import { InviteDialog } from './invite-dialog'
import { RecentInvitations } from './recent-invitations'

type MemberItem =
  inferRouterOutputs<AppRouter>['members']['listForOrganization'][number]

type Props = {
  organizationId: string
  currentUserId: string
  orgPlan: string
}

const ROLE_COLOR: Record<MemberItem['role'], string> = {
  owner: 'text-brand',
  admin: 'text-info',
  member: 'text-text-muted'
}

function DetailRow({
  label,
  value
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b border-ghost-divider py-3 sm:grid-cols-[110px_1fr] sm:gap-4">
      <dt className="font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
        {label}
      </dt>
      <dd className="min-w-0 break-words font-mono text-[12px] text-text-primary">
        {value}
      </dd>
    </div>
  )
}

export function MembersList({ organizationId, currentUserId, orgPlan }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const membersQueryOptions = trpc.members.listForOrganization.queryOptions({
    organizationId
  })
  const membersQuery = useQuery(membersQueryOptions)
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberItem | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const currentMember = membersQuery.data?.find(
    (organizationMember) => organizationMember.userId === currentUserId
  )
  const canManage =
    currentMember?.role === 'owner' || currentMember?.role === 'admin'

  const removeMutation = useMutation(
    trpc.members.remove.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(membersQueryOptions),
          queryClient.invalidateQueries({ queryKey: ['auditLog:list'] })
        ])
        setRemoveTarget(null)
        setSelectedMember(null)
        toast.success('Member removed')
      },
      onError: (error) => toast.error(error.message)
    })
  )

  const members = membersQuery.data ?? []
  const canRemoveSelected =
    canManage &&
    selectedMember?.role !== 'owner' &&
    selectedMember?.userId !== currentUserId

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-7 py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
          <span>
            {members.length} member{members.length !== 1 ? 's' : ''}
            {` · ${orgPlan} plan`}
          </span>
          {!canManage && currentMember ? (
            <Badge variant="outline">read-only</Badge>
          ) : null}
        </div>
        {canManage ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInviteOpen(true)}
          >
            <span className="text-brand">+</span> invite member
          </Button>
        ) : null}
      </div>

      {!canManage && currentMember ? (
        <div className="px-7 py-4">
          <Alert>
            <AlertTitle>Member access is read-only</AlertTitle>
            <AlertDescription>
              You can view member details, but only workspace admins and owners
              can invite or remove people.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-ghost-divider px-7 py-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
        <span>MEMBER</span>
        <span>ROLE</span>
        <span>JOINED</span>
      </div>

      {membersQuery.isLoading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable loading placeholders
            key={index}
            className="border-b border-ghost-divider px-7 py-3.5"
          >
            <div className="h-4 w-2/3 max-w-sm animate-pulse rounded bg-ghost-bg" />
          </div>
        ))
      ) : members.length === 0 ? (
        <div className="px-7 py-14 text-center font-mono text-[12px] text-text-muted">
          no members yet
        </div>
      ) : (
        members.map((organizationMember) => (
          <button
            key={organizationMember.id}
            type="button"
            onClick={() => setSelectedMember(organizationMember)}
            className="grid w-full cursor-pointer grid-cols-[2fr_1fr_1fr] items-center gap-4 border-b border-ghost-divider px-7 py-3.5 text-left transition-colors hover:bg-ghost-bg focus-visible:bg-ghost-bg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Avatar size="sm">
                {organizationMember.user.image ? (
                  <AvatarImage src={organizationMember.user.image} alt="" />
                ) : null}
                <AvatarFallback>
                  {initials(organizationMember.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold text-text-primary">
                  {organizationMember.user.name}
                  {organizationMember.isCurrentUser ? (
                    <span className="ml-1.5 font-mono text-[10px] font-normal text-text-muted">
                      you
                    </span>
                  ) : null}
                </span>
                <span className="truncate font-mono text-[10px] text-text-muted">
                  {organizationMember.user.email}
                </span>
              </span>
            </span>
            <span
              className={cn(
                'font-mono text-[11px]',
                ROLE_COLOR[organizationMember.role]
              )}
            >
              {organizationMember.role}
            </span>
            <span className="font-mono text-[10.5px] text-text-muted">
              {formatDateShort(organizationMember.createdAt)}
            </span>
          </button>
        ))
      )}

      {canManage ? <RecentInvitations organizationId={organizationId} /> : null}

      <Dialog
        open={selectedMember !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null)
        }}
      >
        <DialogContent className="border-ghost-border bg-surface sm:max-w-lg">
          <DialogHeader>
            <span className="flex items-center gap-3">
              <Avatar size="lg">
                {selectedMember?.user.image ? (
                  <AvatarImage src={selectedMember.user.image} alt="" />
                ) : null}
                <AvatarFallback>
                  {initials(selectedMember?.user.name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <span>
                <DialogTitle>{selectedMember?.user.name}</DialogTitle>
                <DialogDescription>
                  {selectedMember?.user.email}
                </DialogDescription>
              </span>
            </span>
          </DialogHeader>
          {selectedMember ? (
            <dl>
              <DetailRow
                label="Role"
                value={<Badge variant="outline">{selectedMember.role}</Badge>}
              />
              <DetailRow
                label="Joined"
                value={formatDateShort(selectedMember.createdAt)}
              />
              <DetailRow label="Member ID" value={selectedMember.id} />
              <DetailRow label="User ID" value={selectedMember.userId} />
              <DetailRow
                label="This is you"
                value={selectedMember.isCurrentUser ? 'Yes' : 'No'}
              />
            </dl>
          ) : null}
          <DialogFooter>
            {canRemoveSelected ? (
              <Button
                variant="destructive"
                onClick={() => setRemoveTarget(selectedMember)}
              >
                Remove member
              </Button>
            ) : (
              <span className="mr-auto font-mono text-[10.5px] text-text-muted">
                {selectedMember?.role === 'owner'
                  ? 'Owners are protected from removal.'
                  : selectedMember?.isCurrentUser
                    ? 'You cannot remove yourself.'
                    : 'You have read-only access.'}
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeTarget?.user.name ?? 'this member'}? They will lose
              access to this organization immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removeTarget) return
                removeMutation.mutate({
                  organizationId,
                  memberId: removeTarget.id
                })
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={organizationId}
      />
    </div>
  )
}
