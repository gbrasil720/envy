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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { initials } from '@/utils/initials'
import { formatDateShort } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'
import { InviteDialog } from './invite-dialog'
import { RecentInvitations } from './recent-invitations'

type Props = {
  organizationId: string
  currentUserId: string
  orgPlan: string
}

const ROLE_COLOR: Record<string, string> = {
  owner: 'text-brand',
  admin: 'text-info',
  member: 'text-text-muted'
}

export function MembersList({ organizationId, currentUserId, orgPlan }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const { data: activeMember } = authClient.useActiveMember()
  const membersQuery = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      const result = await authClient.organization.listMembers({
        query: { organizationId }
      })
      if (result.error) throw new Error(result.error.message)
      return result.data?.members ?? []
    }
  })
  const canManage = Boolean(
    activeMember?.role.includes('owner') || activeMember?.role.includes('admin')
  )

  const removeMutation = useMutation(
    trpc.members.remove.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['organization-members', organizationId]
          }),
          queryClient.invalidateQueries({ queryKey: ['auditLog:list'] })
        ])
        setRemovingUserId(null)
      }
    })
  )

  const members = membersQuery.data ?? []
  const removing = members.find((m) => m.userId === removingUserId)

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-7 py-3">
        <div className="font-mono text-[11px] text-text-muted">
          {members.length} member{members.length !== 1 ? 's' : ''}
          {` · ${orgPlan} plan`}
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="cursor-pointer rounded border border-ghost-border px-2.5 py-1.5 font-mono text-[10.5px] text-text-secondary transition-colors hover:border-brand/50 hover:text-text-primary"
          >
            <span className="mr-1 text-brand">+</span> invite member
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-[2fr_1.2fr_1fr_auto] gap-4 border-b border-ghost-divider px-7 py-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
        <span>MEMBER</span>
        <span>ROLE</span>
        <span>JOINED</span>
        <span />
      </div>

      {membersQuery.isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            key={i}
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
        members.map((member) => (
          <div
            key={member.id}
            className="grid grid-cols-[2fr_1.2fr_1fr_auto] items-center gap-4 border-b border-ghost-divider px-7 py-3.5 transition-colors hover:bg-ghost-bg"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded bg-ghost-bg font-mono text-[10px] text-text-primary">
                {initials(member.user.name)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold text-text-primary">
                  {member.user.name}
                  {member.userId === currentUserId ? (
                    <span className="ml-1.5 font-mono text-[10px] font-normal text-text-muted">
                      you
                    </span>
                  ) : null}
                </span>
                <span className="truncate font-mono text-[10px] text-text-muted">
                  {member.role}
                </span>
              </span>
            </div>
            <span
              className={`font-mono text-[11px] ${
                ROLE_COLOR[member.role] ?? ROLE_COLOR.member
              }`}
            >
              {member.role}
            </span>
            <span className="font-mono text-[10.5px] text-text-muted">
              {formatDateShort(member.createdAt)}
            </span>
            <span className="flex justify-end">
              {member.role.includes('owner') ? (
                <span className="font-mono text-[10.5px] text-text-muted">
                  —
                </span>
              ) : canManage && member.userId !== currentUserId ? (
                <button
                  type="button"
                  onClick={() => setRemovingUserId(member.userId)}
                  className="cursor-pointer font-mono text-[10.5px] text-text-muted transition-colors hover:text-danger"
                >
                  remove
                </button>
              ) : (
                <span className="font-mono text-[10.5px] text-text-muted">
                  —
                </span>
              )}
            </span>
          </div>
        ))
      )}

      {canManage ? <RecentInvitations organizationId={organizationId} /> : null}

      <AlertDialog
        open={!!removingUserId}
        onOpenChange={() => setRemovingUserId(null)}
      >
        <AlertDialogContent className="rounded-md border-ghost-border bg-[#0e0f0e]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <span className="font-mono text-text-primary">
                {removing?.user.name ?? 'this member'}
              </span>
              ? They will lose access to this organization immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={() =>
                removingUserId &&
                removing &&
                removeMutation.mutate({
                  organizationId,
                  memberId: removing.id
                })
              }
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
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
