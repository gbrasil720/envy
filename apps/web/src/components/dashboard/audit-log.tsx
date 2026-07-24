import { AUDIT_ACTION_LABELS } from '@envy/api/lib/audit-actions'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { timeAgoCompact } from '@/utils/time'
import { useTRPCClient } from '@/utils/trpc'

type Props = {
  projectId?: string
  organizationId?: string
  environments?: { id: string; name: string }[]
}

type ActionFilter = 'all' | 'secrets' | 'members' | 'cli'

type AuditPage = {
  logs: {
    id: string
    createdAt: string
    user: { id: string; name: string; image: string | null } | null
    environment: string | null
    userId: string | null
    action: string
    targetKey: string | null
    metadata?: unknown
  }[]
  nextCursor?: string | undefined
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

export function AuditLog({
  projectId,
  organizationId,
  environments = []
}: Props) {
  const trpc = useTRPCClient()
  const [envFilter, setEnvFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')

  const auditQuery = useInfiniteQuery<AuditPage, Error>({
    queryKey: [
      'auditLog:list',
      projectId,
      organizationId,
      envFilter,
      actionFilter
    ],
    queryFn: async ({ pageParam }) => {
      const result = organizationId
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
      return result
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 30_000
  })

  const allLogs = useMemo(() => {
    return auditQuery.data?.pages.flatMap((page) => page.logs) ?? []
  }, [auditQuery.data])

  const isLoading = auditQuery.isLoading
  const isFetchingNext = auditQuery.isFetchingNextPage
  const hasMore = auditQuery.data?.pages.some((p) => p.nextCursor) ?? false

  const loadMore = useCallback(() => {
    auditQuery.fetchNextPage()
  }, [auditQuery])

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-7 py-3.5">
        {FILTERS.map((f) => {
          const active = actionFilter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActionFilter(f.id)}
              className={`cursor-pointer rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                active
                  ? 'border-ghost-border bg-ghost-bg text-text-primary'
                  : 'border-ghost-border/60 bg-transparent text-text-muted hover:border-border-focus hover:text-text-secondary'
              }`}
            >
              {f.label}
            </button>
          )
        })}
        {!organizationId ? (
          <div className="ml-auto flex items-center gap-2">
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="cursor-pointer rounded border border-ghost-border bg-transparent px-2 py-1 font-mono text-[11px] text-text-secondary outline-none focus:border-border-focus"
              aria-label="Filter by environment"
            >
              <option value="all">all envs</option>
              {environments.map((e) => (
                <option key={e.id} value={e.name}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            key={i}
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
            const target = log.targetKey
              ? log.targetKey
              : log.environment
                ? `[${log.environment}]`
                : ''
            return (
              <div
                key={log.id}
                className="grid grid-cols-[110px_1fr_90px_70px] items-baseline gap-4 border-b border-ghost-divider px-7 py-3 font-mono text-[12px] transition-colors hover:bg-ghost-bg sm:grid-cols-[110px_1fr_90px_110px]"
              >
                <span className="truncate text-text-primary">{who}</span>
                <span className="min-w-0 truncate text-text-secondary">
                  <span className={color}>{verb}</span>
                  {target ? ` ${target}` : ''}
                </span>
                <span className="truncate text-[10.5px] text-text-muted">
                  {log.environment ?? '—'}
                </span>
                <span
                  className="text-right text-[10.5px] text-text-muted"
                  title={new Date(log.createdAt).toISOString()}
                >
                  {timeAgoCompact(log.createdAt)}
                </span>
              </div>
            )
          })}

          {hasMore && (
            <div className="flex justify-center py-5">
              <button
                type="button"
                onClick={loadMore}
                disabled={isFetchingNext}
                className="cursor-pointer rounded border border-ghost-border px-4 py-2 font-mono text-[11px] text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary disabled:opacity-50"
              >
                {isFetchingNext ? 'loading...' : 'load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
