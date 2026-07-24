import type { Plan } from '@envy/api/lib/plan-limits'
import { PLAN_LIMITS } from '@envy/api/lib/plan-limits'
import { Avatar, AvatarFallback, AvatarImage } from '@envy/ui/components/avatar'
import { Button } from '@envy/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@envy/ui/components/sheet'
import { Skeleton } from '@envy/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { initials } from '@/utils/initials'
import { useTRPC } from '@/utils/trpc'
import { ThemeSwitcher } from './theme-switcher'
import { UsageBar } from './usage-bar'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
  workspaceName?: string
  organizationId?: string
  onManageBilling: () => void
}

const PLAN_CONFIG: Record<
  Plan,
  {
    label: string
    price: string
    projectLimit: number | null
    secretLimit: number | null
    memberLimit: number | null
    color: string
    badgeClass: string
  }
> = {
  free: {
    label: 'Free',
    price: '$0/mo',
    projectLimit: Number.isFinite(PLAN_LIMITS.free.projects)
      ? PLAN_LIMITS.free.projects
      : null,
    secretLimit: Number.isFinite(PLAN_LIMITS.free.secrets)
      ? PLAN_LIMITS.free.secrets
      : null,
    memberLimit: Number.isFinite(PLAN_LIMITS.free.members)
      ? PLAN_LIMITS.free.members
      : null,
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-0'
  },
  pro: {
    label: 'Pro',
    price: '$9/mo',
    projectLimit: Number.isFinite(PLAN_LIMITS.pro.projects)
      ? PLAN_LIMITS.pro.projects
      : null,
    secretLimit: Number.isFinite(PLAN_LIMITS.pro.secrets)
      ? PLAN_LIMITS.pro.secrets
      : null,
    memberLimit: Number.isFinite(PLAN_LIMITS.pro.members)
      ? PLAN_LIMITS.pro.members
      : null,
    color: 'text-brand',
    badgeClass: 'bg-brand/10 text-brand border-0'
  },
  team: {
    label: 'Team',
    price: '$19/mo',
    projectLimit: Number.isFinite(PLAN_LIMITS.team.projects)
      ? PLAN_LIMITS.team.projects
      : null,
    secretLimit: Number.isFinite(PLAN_LIMITS.team.secrets)
      ? PLAN_LIMITS.team.secrets
      : null,
    memberLimit: Number.isFinite(PLAN_LIMITS.team.members)
      ? PLAN_LIMITS.team.members
      : null,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-0'
  }
}

export function PreferencesSheet({
  open,
  onOpenChange,
  plan,
  workspaceName,
  organizationId,
  onManageBilling
}: Props) {
  const trpc = useTRPC()
  const meQuery = useQuery(trpc.me.get.queryOptions())
  const projectsQuery = useQuery({
    ...trpc.projects.list.queryOptions({
      organizationId: organizationId ?? ''
    }),
    enabled: !!organizationId
  })

  const user = meQuery.data
  const config = plan ? PLAN_CONFIG[plan] : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-border bg-bg p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="font-mono text-[10px] font-normal tracking-[0.1em] text-text-muted">
            ACCOUNT · PROFILE
          </SheetTitle>
        </SheetHeader>

        {meQuery.isLoading ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 rounded" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
            <Skeleton className="h-24 rounded" />
            <Skeleton className="h-32 rounded" />
          </div>
        ) : !user ? null : (
          <div className="flex flex-col gap-7 p-5">
            <section>
              <div className="mb-5 flex items-center gap-4">
                <Avatar className="size-14 shrink-0 rounded">
                  {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                  <AvatarFallback className="rounded bg-ghost-bg font-mono text-[18px] text-text-primary">
                    {initials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-bold text-text-primary">
                    {user.name ?? 'Account'}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted">
                    member since{' '}
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="mb-1.5 font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
                DISPLAY NAME
              </div>
              <div className="mb-4 rounded border border-ghost-border bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] text-text-primary">
                {user.name ?? '—'}
              </div>

              <div className="mb-1.5 font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
                EMAIL
              </div>
              <div className="mb-1 flex items-center justify-between rounded border border-ghost-border bg-surface-2 px-3 py-2.5 font-mono text-[12.5px]">
                <span className="truncate text-text-primary">{user.email}</span>
                <span className="shrink-0 text-[10px] text-brand">
                  verified ✓
                </span>
              </div>
            </section>

            <section>
              <div className="mb-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                WORKSPACE PLAN
              </div>
              {config ? (
                <div className="overflow-hidden rounded border border-ghost-border">
                  <div className="flex items-center justify-between px-4 py-4">
                    <div>
                      <div className="text-[20px] font-bold tracking-[-0.015em] text-text-primary">
                        {config.label}{' '}
                        <span className="text-[13px] font-normal text-text-muted">
                          {config.price}
                        </span>
                      </div>
                      {workspaceName ? (
                        <p className="mt-1 font-mono text-[10px] text-text-muted">
                          {workspaceName} workspace
                        </p>
                      ) : null}
                    </div>
                    {plan !== 'team' ? (
                      <Button
                        size="sm"
                        className="rounded"
                        onClick={onManageBilling}
                      >
                        Manage billing
                      </Button>
                    ) : null}
                  </div>
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex flex-col gap-3">
                      <UsageBar
                        label="Projects"
                        used={
                          projectsQuery.data?.filter(
                            (project) =>
                              project.organizationId === organizationId
                          ).length ?? 0
                        }
                        limit={config.projectLimit}
                      />
                      <UsageBar
                        label="Secrets"
                        used={
                          projectsQuery.data
                            ?.filter(
                              (project) =>
                                project.organizationId === organizationId
                            )
                            .reduce(
                              (total, project) =>
                                total + (project.secretsCount ?? 0),
                              0
                            ) ?? 0
                        }
                        limit={config.secretLimit}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-ghost-border px-4 py-3 text-[12px] text-text-secondary">
                  Select a workspace to view its current plan and limits.
                </div>
              )}
            </section>

            <section>
              <div className="mb-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                CONNECTED ACCOUNTS
              </div>
              <div className="rounded border border-ghost-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] font-semibold text-text-primary">
                    GitHub
                  </span>
                  <span className="font-mono text-[10.5px] text-brand">
                    connected
                  </span>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                APPEARANCE
              </div>
              <div className="rounded border border-ghost-border p-3">
                <ThemeSwitcher />
              </div>
            </section>

            <section className="rounded border border-danger/30 p-4">
              <div className="mb-2 font-mono text-[10px] tracking-[0.08em] text-danger">
                DANGER ZONE
              </div>
              <p className="mb-3 text-[12px] text-text-secondary">
                Permanently delete your account and all associated data.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full rounded"
                disabled
              >
                Delete account
              </Button>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
