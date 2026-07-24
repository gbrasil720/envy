import { AUDIT_ACTION_LABELS } from '@envy/api/lib/audit-actions'
import { Avatar, AvatarFallback } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@envy/ui/components/dialog'
import { cn } from '@envy/ui/lib/utils'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { formatAuditMetadata } from '@/utils/audit-metadata'
import { initials } from '@/utils/initials'
import { timeAgoCompact } from '@/utils/time'
import { useTRPCClient } from '@/utils/trpc'

type Props = {
  projectId?: string
  organizationId?: string
  environments?: { id: string; name: string }[]
}

type ActionFilter = 'all' | 'secrets' | 'members' | 'cli'

type AuditLogItem = {
  id: string
  createdAt: string
  user: { id: string; name: string; image: string | null } | null
  project?: { id: string; name: string; slug: string } | null
  projectId?: string | null
  environment: string | null
  userId: string | null
  action: string
  targetKey: string | null
  metadata?: unknown
}

type AuditPage = {
  logs: AuditLogItem[]
  nextCursor?: string
}

const TONE_TO_CLASS: Record<string, string> = {
  brand: 'text-brand',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-text-secondary'
}

function actionLabel(action: string): { verb: string; color: string } {
  const entry = AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS]
  if (entry) {
    return {
      verb: entry.verb,
      color: TONE_TO_CLASS[entry.tone] ?? 'text-text-secondary'
    }
  }
  return {
    verb: action.replace(/_/g, ' '),
    color: 'text-text-secondary'
  }
}

const FILTERS: { id: ActionFilter; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'secrets', label: 'secrets' },
  { id: 'members', label: 'members' },
  { id: 'cli', label: 'cli' }
]

const PAGE_SIZE = 50

function DetailRow({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b border-ghost-divider py-3 sm:grid-cols-[130px_1fr] sm:gap-4">
      <dt className="font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
        {label}
      </dt>
      <dd className="min-w-0 break-words font-mono text-[12px] text-text-primary">
        {children}
      </dd>
    </div>
  )
}

export function AuditLog({
  projectId,
  organizationId,
  environments = []
}: Props) {
  const trpc = useTRPCClient()
  const [envFilter, setEnvFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  const auditQuery = useInfiniteQuery<AuditPage, Error>({
    queryKey: [
      'auditLog:list',
      projectId,
      organizationId,
      envFilter,
      actionFilter
    ],
    queryFn: async ({ pageParam }) => {
      return organizationId
        ? await trpc.auditLog.listForOrganization.query({
            organizationId,
            limit: PAGE_SIZE,
            ...(actionFilter !== 'all' ? { actionCategory: actionFilter } : {}),
            ...(pageParam ? { cursor: pageParam as string } : {})
          })
        : await trpc.auditLog.list.query({
            projectId: projectId ?? '',
            limit: PAGE_SIZE,
            ...(envFilter !== 'all' ? { environment: envFilter } : {}),
            ...(actionFilter !== 'all' ? { actionCategory: actionFilter } : {}),
            ...(pageParam ? { cursor: pageParam as string } : {})
          })
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 30_000
  })

  const allLogs = useMemo(
    () => auditQuery.data?.pages.flatMap((page) => page.logs) ?? [],
    [auditQuery.data]
  )
  const hasMore =
    auditQuery.data?.pages.some((page) => page.nextCursor) ?? false
  const loadMore = useCallback(() => {
    void auditQuery.fetchNextPage()
  }, [auditQuery])

  const selectedAction = selectedLog ? actionLabel(selectedLog.action) : null
  const selectedContext = selectedLog
    ? formatAuditMetadata(selectedLog.action, selectedLog.metadata)
    : []

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-7 py-3.5">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActionFilter(filter.id)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 font-mono text-[11px] transition-colors',
              actionFilter === filter.id
                ? 'border-ghost-border bg-ghost-bg text-text-primary'
                : 'border-ghost-border/60 bg-transparent text-text-muted hover:border-border-focus hover:text-text-secondary'
            )}
          >
            {filter.label}
          </button>
        ))}
        {!organizationId ? (
          <select
            value={envFilter}
            onChange={(event) => setEnvFilter(event.target.value)}
            className="ml-auto cursor-pointer rounded border border-ghost-border bg-transparent px-2 py-1 font-mono text-[11px] text-text-secondary outline-none focus:border-border-focus"
            aria-label="Filter by environment"
          >
            <option value="all">all envs</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.name}>
                {environment.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {auditQuery.isLoading ? (
        Array.from({ length: 6 }).map((_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable loading placeholders
            key={index}
            className="border-b border-ghost-divider px-7 py-3"
          >
            <div className="h-3.5 w-3/4 max-w-lg animate-pulse rounded bg-ghost-bg" />
          </div>
        ))
      ) : allLogs.length === 0 ? (
        <div className="px-7 py-16 text-center">
          <p className="mb-2 text-[15px] font-semibold text-text-primary">
            No activity yet
          </p>
          <p className="font-mono text-[12px] text-text-muted">
            $ envy push · CLI and dashboard actions land here
          </p>
        </div>
      ) : (
        <>
          {allLogs.map((log) => {
            const { verb, color } = actionLabel(log.action)
            const who =
              log.user?.name ??
              (log.action === 'invitation_expired' ? 'system' : 'deleted user')
            const target =
              log.targetKey ?? (log.environment ? `[${log.environment}]` : '')

            return (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelectedLog(log)}
                className="grid w-full cursor-pointer grid-cols-[110px_1fr_70px] items-baseline gap-4 border-b border-ghost-divider px-7 py-3 text-left font-mono text-[12px] transition-colors hover:bg-ghost-bg focus-visible:bg-ghost-bg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand sm:grid-cols-[110px_1fr_90px_110px]"
              >
                <span className="truncate text-text-primary">{who}</span>
                <span className="min-w-0 truncate text-text-secondary">
                  <span className={color}>{verb}</span>
                  {target ? ` ${target}` : ''}
                </span>
                <span className="hidden truncate text-[10.5px] text-text-muted sm:block">
                  {log.environment ?? '—'}
                </span>
                <span
                  className="text-right text-[10.5px] text-text-muted"
                  title={new Date(log.createdAt).toISOString()}
                >
                  {timeAgoCompact(log.createdAt)}
                </span>
              </button>
            )
          })}

          {hasMore ? (
            <div className="flex justify-center py-5">
              <button
                type="button"
                onClick={loadMore}
                disabled={auditQuery.isFetchingNextPage}
                className="cursor-pointer rounded border border-ghost-border px-4 py-2 font-mono text-[11px] text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary disabled:opacity-50"
              >
                {auditQuery.isFetchingNextPage ? 'loading...' : 'load more'}
              </button>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto border-ghost-border bg-surface sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedLog?.action.replace(/_/g, ' ')}
              </Badge>
              <span className={selectedAction?.color}>
                {selectedAction?.verb}
              </span>
            </div>
            <DialogTitle>Audit event details</DialogTitle>
            <DialogDescription>
              Immutable context captured when this action occurred.
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <dl>
              <DetailRow label="Actor">
                <span className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback>
                      {initials(selectedLog.user?.name ?? 'system')}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {selectedLog.user?.name ??
                      (selectedLog.action === 'invitation_expired'
                        ? 'system'
                        : 'deleted user')}
                    {selectedLog.userId ? ` · ${selectedLog.userId}` : ''}
                  </span>
                </span>
              </DetailRow>
              <DetailRow label="Action">{selectedLog.action}</DetailRow>
              <DetailRow label="Timestamp">
                {new Date(selectedLog.createdAt).toLocaleString()} ·{' '}
                {new Date(selectedLog.createdAt).toISOString()}
              </DetailRow>
              <DetailRow label="Event ID">{selectedLog.id}</DetailRow>
              <DetailRow label="Project">
                {selectedLog.project
                  ? `${selectedLog.project.name} · ${selectedLog.project.slug} · ${selectedLog.project.id}`
                  : (selectedLog.projectId ?? 'Organization-wide')}
              </DetailRow>
              <DetailRow label="Environment">
                {selectedLog.environment ?? '—'}
              </DetailRow>
              <DetailRow label="Target">
                {selectedLog.targetKey ?? '—'}
              </DetailRow>
              {selectedContext.map((item) => (
                <DetailRow key={item.label} label={item.label}>
                  {item.value}
                </DetailRow>
              ))}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
