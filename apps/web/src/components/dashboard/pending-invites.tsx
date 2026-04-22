import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import { Cancel01Icon, UserAdd01Icon } from '@hugeicons/core-free-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'
import { dashboardCardClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'

type Invite = {
  id: string
  email: string
  role: string | null
  expiresAt: Date | string
  createdAt: Date | string
}

type Props = {
  projectId: string
  invites: Invite[]
}

function hoursUntil(date: Date | string) {
  const ms = new Date(date).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `${h}h left`
  const d = Math.floor(h / 24)
  return `${d}d left`
}

export function PendingInvites({ projectId, invites }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const cancelInviteMutation = useMutation(
    trpc.members.cancelInvite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.members.pending.queryOptions({ projectId })
        )
      }
    })
  )

  if (invites.length === 0) return null

  return (
    <Card className={dashboardCardClass}>
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm font-medium">
          Pending invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {invites.map((invite, i) => (
          <div
            key={invite.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              i < invites.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <DashboardIcon
                  icon={UserAdd01Icon}
                  size="md"
                  className="text-muted-foreground"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.role ?? 'member'} · expires{' '}
                  {new Date(invite.expiresAt).toLocaleString()} ·{' '}
                  <span className="tabular-nums">
                    {hoursUntil(invite.expiresAt)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant="secondary"
                className="border-0 bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400"
              >
                pending
              </Badge>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() =>
                        cancelInviteMutation.mutate({
                          invitationId: invite.id
                        })
                      }
                      aria-label="Cancel invitation"
                    />
                  }
                >
                  <DashboardIcon icon={Cancel01Icon} size="sm" />
                </TooltipTrigger>
                <TooltipContent>Cancel invitation</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
