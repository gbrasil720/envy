import { Avatar, AvatarFallback, AvatarImage } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@envy/ui/components/empty'
import { Input } from '@envy/ui/components/input'
import { Label } from '@envy/ui/components/label'
import { ScrollArea } from '@envy/ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@envy/ui/components/select'
import { Skeleton } from '@envy/ui/components/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@envy/ui/components/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import {
  Delete01Icon,
  Download01Icon,
  FileKeyIcon,
  Key01Icon,
  Upload01Icon,
  UserAdd01Icon,
  UserMinus01Icon,
  Wrench01Icon
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'

type Props = {
  projectId: string
  environments: { id: string; name: string }[]
}

type ActionFilter = 'all' | 'secrets'

const SECRET_ACTIONS = new Set([
  'pushed',
  'pulled',
  'secret_created',
  'secret_updated',
  'secret_deleted'
])

/** Leading cap for log labels; leaves emails unchanged. */
function capitalizeLabel(text: string) {
  const t = text.trim()
  if (!t) return text
  if (t.includes('@')) return text
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Title-style words for display names (not secret keys). */
function capitalizeWords(text: string) {
  const t = text.trim()
  if (!t) return text
  if (t.includes('@')) return t
  return t
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function formatAction(
  action: string,
  targetKey?: string | null,
  environment?: string | null
) {
  const parts: { text: string; muted?: boolean }[] = []
  switch (action) {
    case 'pushed':
      parts.push({ text: 'Pushed secrets' })
      if (environment) {
        parts.push({ text: `To ${capitalizeLabel(environment)}`, muted: true })
      }
      break
    case 'pulled':
      parts.push({ text: 'Pulled secrets' })
      if (environment) {
        parts.push({
          text: `From ${capitalizeLabel(environment)}`,
          muted: true
        })
      }
      break
    case 'secret_created':
      parts.push({ text: 'Created' })
      if (targetKey)
        parts.push({ text: capitalizeLabel(targetKey), muted: true })
      if (environment) {
        parts.push({ text: `In ${capitalizeLabel(environment)}`, muted: true })
      }
      break
    case 'secret_updated':
      parts.push({ text: 'Updated' })
      if (targetKey)
        parts.push({ text: capitalizeLabel(targetKey), muted: true })
      if (environment) {
        parts.push({ text: `In ${capitalizeLabel(environment)}`, muted: true })
      }
      break
    case 'secret_deleted':
      parts.push({ text: 'Deleted' })
      if (targetKey)
        parts.push({ text: capitalizeLabel(targetKey), muted: true })
      if (environment) {
        parts.push({
          text: `From ${capitalizeLabel(environment)}`,
          muted: true
        })
      }
      break
    case 'member_invited':
      parts.push({ text: 'Invited' })
      if (targetKey)
        parts.push({ text: capitalizeLabel(targetKey), muted: true })
      break
    case 'member_removed':
      parts.push({ text: 'Removed' })
      if (targetKey)
        parts.push({ text: capitalizeLabel(targetKey), muted: true })
      break
    default:
      parts.push({
        text: capitalizeWords(action.replace(/_/g, ' '))
      })
  }
  return parts
}

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function actionIcon(action: string): IconSvgElement {
  switch (action) {
    case 'pushed':
      return Upload01Icon
    case 'pulled':
      return Download01Icon
    case 'secret_created':
      return FileKeyIcon
    case 'secret_updated':
      return Wrench01Icon
    case 'secret_deleted':
      return Delete01Icon
    case 'member_invited':
      return UserAdd01Icon
    case 'member_removed':
      return UserMinus01Icon
    case 'key_generated':
    case 'key_revoked':
      return Key01Icon
    default:
      return FileKeyIcon
  }
}

function actionTone(action: string): string {
  switch (action) {
    case 'secret_deleted':
    case 'key_revoked':
      return 'bg-destructive/15 text-destructive'
    case 'secret_updated':
    case 'member_invited':
      return 'bg-info/10 text-info'
    case 'member_removed':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    default:
      return 'bg-brand/10 text-brand'
  }
}

function dateBucket(d: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const y = new Date(d)
  y.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - y.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'Last 7 days'
  return 'Earlier'
}

export function AuditLog({ projectId, environments }: Props) {
  const trpc = useTRPC()
  const [envFilter, setEnvFilter] = useState<string>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(50)

  const membersQuery = useQuery(trpc.members.list.queryOptions({ projectId }))

  const auditQuery = useQuery(
    trpc.auditLog.list.queryOptions({
      projectId,
      limit,
      offset: 0,
      ...(envFilter !== 'all' ? { environment: envFilter } : {}),
      ...(memberFilter !== 'all' ? { userId: memberFilter } : {})
    })
  )

  const logs = auditQuery.data ?? []

  const hasActiveFilters =
    envFilter !== 'all' ||
    memberFilter !== 'all' ||
    actionFilter === 'secrets' ||
    search.trim() !== ''

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter === 'secrets' && !SECRET_ACTIONS.has(log.action)) {
        return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const key = (log.targetKey ?? '').toLowerCase()
        const act = log.action.toLowerCase()
        if (!key.includes(q) && !act.includes(q)) return false
      }
      return true
    })
  }, [logs, actionFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const log of filtered) {
      const bucket = dateBucket(new Date(log.createdAt))
      if (!map.has(bucket)) map.set(bucket, [])
      map.get(bucket)?.push(log)
    }
    const order = ['Today', 'Yesterday', 'Last 7 days', 'Earlier']
    return order.reduce<{ label: string; items: typeof filtered }[]>(
      (acc, k) => {
        if (map.has(k)) {
          acc.push({ label: k, items: map.get(k) ?? [] })
        }
        return acc
      },
      []
    )
  }, [filtered])

  const firstSectionLabel = useMemo(
    () => grouped.find((g) => g.items.length > 0)?.label,
    [grouped]
  )

  if (auditQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
        {['a', 'b', 'c', 'd'].map((k) => (
          <div key={k} className="flex items-start gap-3">
            <Skeleton className="mt-1 size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (logs.length === 0 && !hasActiveFilters) {
    return (
      <Empty className="min-h-[320px] rounded-xl border border-dashed border-border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DashboardIcon icon={FileKeyIcon} size="md" />
          </EmptyMedia>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>
            Actions from the CLI and dashboard will show up here. Try{' '}
            <code className="rounded bg-muted px-1 font-mono text-[11px]">
              envy push
            </code>{' '}
            or{' '}
            <a
              href="https://docs.useenvy.dev/cli"
              className="underline underline-offset-4 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              read the CLI docs
            </a>
            .
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="audit-env"
              className="text-xs text-muted-foreground"
            >
              Environment
            </Label>
            <Select
              value={envFilter}
              onValueChange={(v) => setEnvFilter(v ?? 'all')}
            >
              <SelectTrigger
                id="audit-env"
                className="h-9 w-[180px] rounded-md"
              >
                <SelectValue placeholder="All environments">
                  {(value) =>
                    value === 'all' || value == null
                      ? 'All environments'
                      : String(value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all">All environments</SelectItem>
                {environments.map((e) => (
                  <SelectItem key={e.id} value={e.name}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="audit-member"
              className="text-xs text-muted-foreground"
            >
              Member
            </Label>
            <Select
              value={memberFilter}
              onValueChange={(v) => setMemberFilter(v ?? 'all')}
            >
              <SelectTrigger
                id="audit-member"
                className="h-9 w-[200px] rounded-md"
              >
                <SelectValue placeholder="All members">
                  {(value) => {
                    if (value === 'all' || value == null) return 'All members'
                    const row = membersQuery.data?.find(
                      (m) => m.userId === value
                    )
                    return row?.user?.name
                      ? capitalizeWords(row.user.name)
                      : 'Member'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all">All members</SelectItem>
                {membersQuery.data?.map((m) => (
                  <SelectItem key={m.id} value={m.userId}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-4">
                        {m.user.image ? (
                          <AvatarImage src={m.user.image} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[8px]">
                          {m.user.name?.slice(0, 2).toUpperCase() ?? '??'}
                        </AvatarFallback>
                      </Avatar>
                      {capitalizeWords(m.user.name ?? 'Unknown')}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Type</span>
            <ToggleGroup
              value={[actionFilter]}
              onValueChange={(v) => {
                const x = v[0]
                if (x === 'all' || x === 'secrets') {
                  setActionFilter(x)
                }
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="secrets">Secrets</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-1.5">
          <Label
            htmlFor="audit-search"
            className="text-xs text-muted-foreground"
          >
            Search
          </Label>
          <Input
            id="audit-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Action or key…"
            className="h-9"
          />
        </div>
      </div>

      <ScrollArea
        className="w-full min-w-0 rounded-xl border border-border"
        viewportClassName="max-h-[min(800px,calc(100vh-200px))]"
      >
        <div className="flex flex-col px-0 pb-1 pt-0">
          {grouped.map((group) =>
            group.items.length > 0 ? (
              <div key={group.label} className="mb-2">
                <p
                  className={`sticky top-0 z-10 bg-card px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${
                    group.label === firstSectionLabel
                      ? 'rounded-b-lg'
                      : 'rounded-lg'
                  }`}
                >
                  {group.label}
                </p>
                <div className="divide-y divide-border">
                  {group.items.map((log) => {
                    const parts = formatAction(
                      log.action,
                      log.targetKey,
                      log.environment
                    )
                    const icon = actionIcon(log.action)
                    return (
                      <div key={log.id} className="flex gap-3 px-3 py-3">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${actionTone(log.action)}`}
                        >
                          <DashboardIcon icon={icon} size="md" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">
                            {parts.map((part, j) => (
                              <span
                                // biome-ignore lint/suspicious/noArrayIndexKey: static ordered tokens from formatAction
                                key={j}
                                className={
                                  part.muted ? 'text-muted-foreground' : ''
                                }
                              >
                                {part.text}
                                {j < parts.length - 1 ? ' ' : ''}
                              </span>
                            ))}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {log.environment ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {capitalizeLabel(log.environment)}
                              </Badge>
                            ) : null}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="cursor-default tabular-nums">
                                    {timeAgo(log.createdAt)}
                                  </span>
                                }
                              />
                              <TooltipContent>
                                {new Date(log.createdAt).toISOString()}
                              </TooltipContent>
                            </Tooltip>
                            <span className="font-mono text-xs flex items-center gap-1">
                              — By{' '}
                              {log.user?.name
                                ? capitalizeWords(log.user.name)
                                : 'System'}{' '}
                              {log.user?.image ? (
                                <Avatar className="size-4">
                                  <AvatarImage src={log.user.image} alt="" />
                                  <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                                    {log.user.name?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null}
                            </span>
                            {log.metadata &&
                            typeof log.metadata === 'object' &&
                            'source' in log.metadata ? (
                              <span>
                                Via{' '}
                                {capitalizeLabel(
                                  (log.metadata as { source: string }).source
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>
      </ScrollArea>

      {filtered.length === 0 && hasActiveFilters ? (
        <p className="text-center text-sm text-muted-foreground">
          No entries match your filters.
        </p>
      ) : null}

      {auditQuery.data && auditQuery.data.length >= limit ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          onClick={() => setLimit((l) => l + 50)}
        >
          Load more
        </Button>
      ) : null}
    </div>
  )
}
