import { Avatar, AvatarFallback, AvatarImage } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@envy/ui/components/sheet'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  Cancel01Icon,
  CrownIcon,
  StarIcon,
  UserIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { initials } from '@/utils/initials'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'
import { ThemeSwitcher } from './theme-switcher'
import { UsageBar } from './usage-bar'

type Plan = 'free' | 'pro' | 'team'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
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
    projectLimit: 1,
    secretLimit: 50,
    memberLimit: 1,
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-0'
  },
  pro: {
    label: 'Pro',
    price: '$9/mo',
    projectLimit: null,
    secretLimit: null,
    memberLimit: 1,
    color: 'text-brand',
    badgeClass: 'bg-brand/10 text-brand border-0'
  },
  team: {
    label: 'Team',
    price: '$19/mo',
    projectLimit: null,
    secretLimit: null,
    memberLimit: 5,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-0'
  }
}

export function PreferencesSheet({ open, onOpenChange }: Props) {
  const trpc = useTRPC()
  const meQuery = useQuery(trpc.me.get.queryOptions())

  const user = meQuery.data
  const plan = (user?.plan ?? 'free') as Plan
  const config = PLAN_CONFIG[plan]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-medium">Preferences</SheetTitle>
          </div>
        </SheetHeader>

        {meQuery.isLoading ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : !user ? null : (
          <div className="flex flex-col gap-5 p-5">
            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                <Avatar className="size-10 shrink-0">
                  {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                  <AvatarFallback className="bg-brand/15 text-xs font-semibold text-brand">
                    {initials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {user.name ?? 'Account'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <Badge className={config.badgeClass}>{config.label}</Badge>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Plan
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DashboardIcon
                      icon={
                        plan === 'free'
                          ? UserIcon
                          : plan === 'pro'
                            ? StarIcon
                            : CrownIcon
                      }
                      size="sm"
                      className={config.color}
                    />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {config.price}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <UsageBar
                    label="Projects"
                    used={user.projectCount ?? 0}
                    limit={config.projectLimit}
                  />
                  {plan === 'free' ? (
                    <UsageBar
                      label="Secrets"
                      used={user.secretCount ?? 0}
                      limit={50}
                    />
                  ) : (
                    config.memberLimit !== null && (
                      <UsageBar
                        label="Members per project"
                        used={1}
                        limit={config.memberLimit}
                      />
                    )
                  )}
                </div>

                {plan !== 'team' && (
                  <Button
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      // TODO: checkout
                    }}
                  >
                    Upgrade to {plan === 'free' ? 'Pro' : 'Team'}
                  </Button>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Details
              </p>
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span>
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auth provider</span>
                  <span>GitHub</span>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Appearance
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <ThemeSwitcher />
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive/70">
                Danger zone
              </p>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled
                >
                  <DashboardIcon
                    icon={Cancel01Icon}
                    size="sm"
                    data-icon="inline-start"
                  />
                  Delete account
                </Button>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
