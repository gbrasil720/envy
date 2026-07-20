import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'

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
  if (h < 24) return `expires in ${h}h`
  const d = Math.floor(h / 24)
  return `expires in ${d}d`
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
    <div className="px-7 py-5">
      <div className="mb-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
        PENDING INVITES
      </div>
      <div className="flex flex-col gap-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between gap-3 rounded border border-dashed border-ghost-border px-4 py-3"
          >
            <span className="min-w-0 truncate font-mono text-[12px] text-text-secondary">
              {invite.email}{' '}
              <span className="text-text-muted">
                · {invite.role ?? 'member'} · {hoursUntil(invite.expiresAt)}
              </span>
            </span>
            <button
              type="button"
              onClick={() =>
                cancelInviteMutation.mutate({ invitationId: invite.id })
              }
              disabled={cancelInviteMutation.isPending}
              className="shrink-0 cursor-pointer font-mono text-[10.5px] text-text-muted transition-colors hover:text-danger disabled:opacity-50"
            >
              cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
