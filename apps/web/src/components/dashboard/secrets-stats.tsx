import { Card, CardContent } from '@envy/ui/components/card'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  Activity01Icon,
  DashboardSpeed01Icon,
  Key01Icon
} from '@hugeicons/core-free-icons'
import { PLAN_LIMITS } from '@envy/api/lib/plan-limits'
import { useQuery } from '@tanstack/react-query'
import { timeAgoVerbose } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'
import { dashboardCardClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'

const PLAN_SECRET_LIMIT: Record<string, number> = {
  free: PLAN_LIMITS.free.secrets,
  pro: PLAN_LIMITS.pro.secrets,
  team: PLAN_LIMITS.team.secrets
}

type Props = {
  projectId: string
  environment: string
  secretCount: number
  projectPlan: string
}

export function SecretsStats({
  projectId,
  environment,
  secretCount,
  projectPlan
}: Props) {
  const trpc = useTRPC()

  const lastQuery = useQuery(
    trpc.auditLog.list.queryOptions({
      projectId,
      environment,
      limit: 1
    })
  )

  const lastLog = lastQuery.data?.logs?.[0]
  const limit = PLAN_SECRET_LIMIT[projectPlan] ?? PLAN_SECRET_LIMIT.free
  const pct =
    Number.isFinite(limit) && limit! > 0
      ? Math.min(100, Math.round((secretCount / limit!) * 100))
      : 0

  if (lastQuery.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {['a', 'b', 'c'].map((k) => (
          <Skeleton key={k} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className={dashboardCardClass}>
        <CardContent className="flex flex-col gap-1 p-4 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <DashboardIcon icon={Key01Icon} size="sm" className="text-brand" />
            This environment
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {secretCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-mono">{environment}</span>
          </p>
        </CardContent>
      </Card>
      <Card className={dashboardCardClass}>
        <CardContent className="flex flex-col gap-1 p-4 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <DashboardIcon
              icon={DashboardSpeed01Icon}
              size="sm"
              className="text-muted-foreground"
            />
            Plan usage
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {Number.isFinite(limit)
              ? `${secretCount} / ${limit}`
              : `${secretCount}`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {Number.isFinite(limit)
              ? `${pct}% of ${projectPlan} tier limit`
              : 'Unlimited on this plan'}
          </p>
        </CardContent>
      </Card>
      <Card className={dashboardCardClass}>
        <CardContent className="flex flex-col gap-1 p-4 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <DashboardIcon
              icon={Activity01Icon}
              size="sm"
              className="text-muted-foreground"
            />
            Last activity
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {timeAgoVerbose(lastLog?.createdAt)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {lastLog
              ? `${lastLog.action.replace(/_/g, ' ')}${lastLog.targetKey ? ` · ${lastLog.targetKey}` : ''}`
              : 'No audit events for this environment yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
