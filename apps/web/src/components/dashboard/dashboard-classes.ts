import { cn } from '@envy/ui/lib/utils'

export const dashboardCardClass = cn(
  'rounded-xl border-border shadow-sm bg-card/80 backdrop-blur-sm'
)

export const dashboardInsetCardClass = cn(
  'rounded-lg border-0 bg-background/50 shadow-none'
)

export function dashboardPlanBadgeClass(plan: string) {
  if (plan === 'pro') return 'border-0 bg-brand/10 text-brand'
  if (plan === 'team') return 'border-0 bg-info/10 text-info'
  return 'border-0 bg-muted text-muted-foreground'
}
