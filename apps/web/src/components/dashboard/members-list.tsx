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
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import {
  Cancel01Icon,
  UserAdd01Icon,
  UserGroupIcon
} from '@hugeicons/core-free-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'
import { dashboardCardClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'
import { InviteDialog } from './invite-dialog'
import { PendingInvites } from './pending-invites'

type Props = {
  projectId: string
  currentUserId: string
  currentUserRole: string
  orgPlan: string
}

const roleBadgeClass: Record<string, string> = {
  owner: 'border-0 bg-brand/10 font-medium text-brand',
  admin: 'border-0 bg-info/10 font-medium text-info',
  member: 'border-0 bg-muted text-muted-foreground'
}

const ROLE_HELP: Record<string, string> = {
  owner: 'Full access; billing and deletion (where available).',
  admin: 'Manage secrets, environments, and invitations.',
  member: 'View and pull secrets; cannot change project settings.'
}

function formatUserId(userId: string) {
  if (userId.length <= 12) return userId
  return `${userId.slice(0, 6)}…${userId.slice(-4)}`
}

function initialsFromId(userId: string) {
  return (
    userId
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || '??'
  )
}

const MEMBER_CAP: Record<string, number> = {
  free: 1,
  pro: 1,
  team: 5
}

export function MembersList({
  projectId,
  currentUserId,
  currentUserRole,
  orgPlan
}: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  const canManage = ['owner', 'admin'].includes(currentUserRole)

  const membersQuery = useQuery(trpc.members.list.queryOptions({ projectId }))

  const pendingQuery = useQuery(
    trpc.members.pending.queryOptions({ projectId }, { enabled: canManage })
  )

  const removeMutation = useMutation(
    trpc.members.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.members.list.queryOptions({ projectId })
        )
        setRemovingUserId(null)
      }
    })
  )

  const members = membersQuery.data ?? []
  const pending = pendingQuery.data ?? []
  const cap = MEMBER_CAP[orgPlan] ?? 1

  return (
    <div className="flex flex-col gap-5">
      <Card className={dashboardCardClass}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10">
              <DashboardIcon
                icon={UserGroupIcon}
                size="md"
                className="text-brand"
              />
            </div>
            <div>
              <CardTitle className="text-base">Members</CardTitle>
              <p className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
                {canManage ? ` · ${pending.length} pending` : ''}
                {orgPlan === 'team'
                  ? ` · up to ${cap} on Team`
                  : ` · ${cap} seat on ${orgPlan}`}
              </p>
            </div>
          </div>
          {canManage ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setInviteOpen(true)}
            >
              <DashboardIcon
                icon={UserAdd01Icon}
                size="sm"
                data-icon="inline-start"
              />
              Invite
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {membersQuery.isLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {['a', 'b'].map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            members.map((member, i) => (
              <div
                key={member.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  i < members.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10">
                    {member.user.image ? (
                      <AvatarImage src={member.user.image} alt="" />
                    ) : (
                      <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                        {initialsFromId(member.user.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium tracking-tight">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.createdAt
                        ? `Joined ${new Date(member.createdAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex cursor-default">
                          <Badge
                            className={
                              roleBadgeClass[member.role] ??
                              roleBadgeClass.member
                            }
                          >
                            {member.role.charAt(0).toUpperCase() +
                              member.role.slice(1)}
                          </Badge>
                        </span>
                      }
                    />
                    <TooltipContent className="max-w-xs">
                      {ROLE_HELP[member.role] ?? member.role}
                    </TooltipContent>
                  </Tooltip>
                  {canManage &&
                    member.role !== 'owner' &&
                    member.userId !== currentUserId && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setRemovingUserId(member.userId)}
                              aria-label="Remove member"
                            />
                          }
                        >
                          <DashboardIcon icon={Cancel01Icon} size="sm" />
                        </TooltipTrigger>
                        <TooltipContent>Remove member</TooltipContent>
                      </Tooltip>
                    )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <PendingInvites projectId={projectId} invites={pending} />
      ) : null}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projectId={projectId}
      />

      <AlertDialog
        open={!!removingUserId}
        onOpenChange={() => setRemovingUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <span className="font-mono font-medium">
                {removingUserId ? formatUserId(removingUserId) : ''}
              </span>
              ? They will lose access to this project immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                removingUserId &&
                removeMutation.mutate({ projectId, userId: removingUserId })
              }
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
