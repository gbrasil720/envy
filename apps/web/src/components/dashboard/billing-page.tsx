import { PLAN_LIMITS, type Plan } from '@envy/api/lib/plan-limits'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle
} from '@envy/ui/components/alert'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@envy/ui/components/empty'
import {
  Progress,
  ProgressLabel,
  ProgressValue
} from '@envy/ui/components/progress'
import { Separator } from '@envy/ui/components/separator'
import { Skeleton } from '@envy/ui/components/skeleton'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowUpRightIcon,
  CalendarClockIcon,
  CheckIcon,
  CreditCardIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UsersRoundIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateShort } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'

type Props = {
  organizationId: string
  organizationName: string
  organizationType: 'personal' | 'team'
}

type SubscriptionStatus =
  | 'active'
  | 'on_hold'
  | 'cancelled'
  | 'expired'
  | 'failed'
  | 'free'

const PLAN_PRICE: Record<Plan, string> = {
  free: '$0',
  pro: '$9',
  team: '$19'
}

const PLAN_SUMMARY: Record<Plan, string> = {
  free: 'The essentials for a private workspace.',
  pro: 'Unlimited project capacity for solo work.',
  team: 'Shared access for focused engineering teams.'
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  if (status === 'active') return <Badge>active</Badge>
  if (status === 'cancelled') return <Badge variant="outline">cancelled</Badge>
  if (status === 'on_hold' || status === 'failed') {
    return <Badge variant="destructive">{status.replace('_', ' ')}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

function formatLimit(limit: number) {
  return Number.isFinite(limit) ? String(limit) : 'Unlimited'
}

function lifecycleDate(input: {
  status: SubscriptionStatus
  currentPeriodEnd?: Date | string | null
  cancelAtPeriodEnd?: Date | string | null
}) {
  const date = input.cancelAtPeriodEnd ?? input.currentPeriodEnd

  if (input.status === 'free') {
    return { label: 'BILLING CYCLE', value: 'No renewal date' }
  }
  if (!date) {
    return { label: 'BILLING CYCLE', value: 'Monthly' }
  }
  if (input.status === 'cancelled') {
    return { label: 'PAID ACCESS UNTIL', value: formatDateShort(date) }
  }
  if (input.status === 'expired') {
    return { label: 'PERIOD ENDED', value: formatDateShort(date) }
  }
  if (input.status === 'active' && input.cancelAtPeriodEnd) {
    return { label: 'CANCELLATION DATE', value: formatDateShort(date) }
  }
  return { label: 'RENEWS ON', value: formatDateShort(date) }
}

function BillingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  )
}

export function BillingPage({
  organizationId,
  organizationName,
  organizationType
}: Props) {
  const trpc = useTRPC()
  const billingQuery = useQuery(
    trpc.billing.status.queryOptions({ organizationId })
  )
  const portalMutation = useMutation(
    trpc.billing.portal.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(error.message)
    })
  )
  const checkoutMutation = useMutation(
    trpc.billing.checkout.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(error.message)
    })
  )

  if (billingQuery.isPending) return <BillingSkeleton />

  const billing = billingQuery.data
  if (!billing) {
    return (
      <Empty className="min-h-96">
        <EmptyHeader>
          <EmptyTitle>Billing data is unavailable</EmptyTitle>
          <EmptyDescription>
            We could not load this organization&apos;s plan and subscription.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => billingQuery.refetch()}>
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const subscriptionStatus: SubscriptionStatus =
    billing.subscription?.status ?? 'free'
  const period = lifecycleDate({
    status: subscriptionStatus,
    currentPeriodEnd: billing.subscription?.currentPeriodEnd,
    cancelAtPeriodEnd: billing.subscription?.cancelAtPeriodEnd
  })
  const upgradePlan = organizationType === 'team' ? 'team' : 'pro'
  const needsUpgrade = billing.plan !== upgradePlan
  const planLimits = PLAN_LIMITS[billing.plan]
  const progress = Math.min(
    100,
    (billing.memberCount / billing.seatLimit) * 100
  )
  const remainingSeats = Math.max(0, billing.seatLimit - billing.memberCount)
  const overCapacity = Math.max(0, billing.memberCount - billing.seatLimit)
  const actionPending = checkoutMutation.isPending || portalMutation.isPending

  const openPortal = () => portalMutation.mutate({ organizationId })
  const startCheckout = () =>
    checkoutMutation.mutate({
      organizationId,
      plan: upgradePlan,
      returnPath: `${window.location.pathname}?billing=confirming`
    })
  const openMembers = () =>
    window.location.assign(
      window.location.pathname.replace(
        /\/settings\/billing$/,
        '/settings/members'
      )
    )
  const canResolveCapacityWithUpgrade =
    organizationType === 'team' && needsUpgrade

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7">
      <header className="flex flex-col gap-2">
        <div className="font-mono text-[10px] tracking-[0.12em] text-text-muted">
          ORGANIZATION · BILLING
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.025em] text-text-primary">
              Billing &amp; plan
              <span className="text-brand">.</span>
            </h1>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-text-secondary">
              Monitor subscription health, capacity, and plan allowances for{' '}
              <span className="font-medium text-text-primary">
                {organizationName}
              </span>
              .
            </p>
          </div>
          <Badge variant="outline">
            {billing.canManageSubscription ? (
              <ShieldCheckIcon data-icon="inline-start" />
            ) : (
              <LockKeyholeIcon data-icon="inline-start" />
            )}
            {billing.canManageSubscription ? 'owner controls' : 'view only'}
          </Badge>
        </div>
      </header>

      {billing.isReadOnly ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Organization is read-only</AlertTitle>
          <AlertDescription>
            This organization has {billing.memberCount} members on a{' '}
            {billing.seatLimit}-seat plan. Remove members or upgrade to restore
            changes.
          </AlertDescription>
          {billing.canManageSubscription ? (
            <AlertAction>
              <Button
                disabled={actionPending}
                size="xs"
                variant="destructive"
                onClick={
                  canResolveCapacityWithUpgrade ? startCheckout : openMembers
                }
              >
                {canResolveCapacityWithUpgrade ? 'Upgrade' : 'Members'}
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}

      {subscriptionStatus === 'on_hold' || subscriptionStatus === 'failed' ? (
        <Alert variant="destructive">
          <CreditCardIcon />
          <AlertTitle>Subscription needs attention</AlertTitle>
          <AlertDescription>
            Payment could not be confirmed. The organization owner can update
            payment details from the billing portal.
          </AlertDescription>
          {billing.canManageSubscription && billing.hasCustomer ? (
            <AlertAction>
              <Button
                disabled={actionPending}
                size="xs"
                variant="destructive"
                onClick={openPortal}
              >
                Fix billing
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}

      {subscriptionStatus === 'cancelled' ? (
        <Alert>
          <CalendarClockIcon />
          <AlertTitle>Cancellation scheduled</AlertTitle>
          <AlertDescription>
            Paid plan access remains available through {period.value}. After
            that date, this organization returns to Free plan limits.
          </AlertDescription>
        </Alert>
      ) : null}

      {!billing.canManageSubscription ? (
        <Alert>
          <LockKeyholeIcon />
          <AlertTitle>Subscription controls are owner-only</AlertTitle>
          <AlertDescription>
            You can review plan and usage details, but only an organization
            owner can change the plan, payment method, or billing settings.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-[10px] tracking-[0.1em] text-text-muted">
              CURRENT PLAN
            </CardTitle>
            <CardDescription>
              {organizationType === 'team' ? 'Team' : 'Personal'} organization
            </CardDescription>
            <CardAction>
              <StatusBadge status={subscriptionStatus} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[34px] font-bold tracking-[-0.04em] text-text-primary capitalize">
                  {billing.plan}
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  {PLAN_SUMMARY[billing.plan]}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[26px] font-bold tracking-[-0.03em] text-text-primary">
                  {PLAN_PRICE[billing.plan]}
                </span>
                <span className="text-[11px] text-text-muted"> / month</span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="font-mono text-[9px] tracking-[0.08em] text-text-muted">
                  SUBSCRIPTION
                </span>
                <span className="mt-1.5 block text-[12px] font-medium text-text-primary capitalize">
                  {subscriptionStatus.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] tracking-[0.08em] text-text-muted">
                  {period.label}
                </span>
                <span className="mt-1.5 block text-[12px] font-medium text-text-primary">
                  {period.value}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] tracking-[0.08em] text-text-muted">
                  CAPACITY
                </span>
                <span className="mt-1.5 block text-[12px] font-medium text-text-primary">
                  {billing.memberCount} / {billing.seatLimit} seats
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="font-mono text-[10px] text-text-muted">
            Subscription state is synchronized from the payment provider.
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing controls</CardTitle>
            <CardDescription>
              Plans, payment methods, receipts, and invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {billing.canManageSubscription ? (
              <>
                <div className="flex size-10 items-center justify-center rounded border border-ghost-border bg-ghost-bg text-text-primary">
                  <CreditCardIcon className="size-4" />
                </div>
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  Secure billing controls open in the customer portal. You will
                  return here when finished.
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  {needsUpgrade ? (
                    <Button disabled={actionPending} onClick={startCheckout}>
                      {checkoutMutation.isPending
                        ? 'Opening checkout…'
                        : `Upgrade to ${upgradePlan}`}
                      <ArrowUpRightIcon data-icon="inline-end" />
                    </Button>
                  ) : null}
                  {billing.hasCustomer ? (
                    <Button
                      disabled={actionPending}
                      variant={needsUpgrade ? 'outline' : 'default'}
                      onClick={openPortal}
                    >
                      <CreditCardIcon data-icon="inline-start" />
                      {portalMutation.isPending
                        ? 'Opening portal…'
                        : 'Manage subscription'}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-7 text-center">
                <div className="flex size-10 items-center justify-center rounded border border-ghost-border bg-ghost-bg text-text-muted">
                  <LockKeyholeIcon className="size-4" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-text-primary">
                    Owner access required
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                    Ask an organization owner to update billing.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="font-mono text-[10px] text-text-muted">
            {billing.canManageSubscription
              ? 'You are authorized to manage this subscription.'
              : 'Your billing access is read-only.'}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seat capacity</CardTitle>
            <CardDescription>
              Current members measured against the active plan limit.
            </CardDescription>
            <CardAction>
              <UsersRoundIcon className="size-4 text-text-muted" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-[30px] font-bold tracking-[-0.035em] text-text-primary">
                  {billing.memberCount}
                </span>
                <span className="ml-1.5 text-[12px] text-text-muted">
                  members
                </span>
              </div>
              <span className="font-mono text-[10px] text-text-muted">
                {overCapacity > 0
                  ? `${overCapacity} over capacity`
                  : `${remainingSeats} available`}
              </span>
            </div>
            <Progress value={progress}>
              <ProgressLabel>Seat utilization</ProgressLabel>
              <ProgressValue>
                {() => `${billing.memberCount} of ${billing.seatLimit}`}
              </ProgressValue>
            </Progress>
          </CardContent>
          <CardFooter className="font-mono text-[10px] text-text-muted">
            {billing.isReadOnly
              ? 'Writes remain blocked until capacity is resolved.'
              : 'Capacity is within the current plan limit.'}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan includes</CardTitle>
            <CardDescription>
              Allowances active for this organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              {
                label: 'Projects',
                value: formatLimit(planLimits.projects)
              },
              {
                label: 'Secrets',
                value: formatLimit(planLimits.secrets)
              },
              {
                label: 'Members',
                value: formatLimit(planLimits.members)
              }
            ].map((allowance) => (
              <div
                key={allowance.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2 text-[12px] text-text-secondary">
                  <CheckIcon className="size-3.5 text-brand" />
                  {allowance.label}
                </span>
                <span className="font-mono text-[10px] text-text-primary">
                  {allowance.value}
                </span>
              </div>
            ))}
          </CardContent>
          <CardFooter className="font-mono text-[10px] text-text-muted">
            Limits apply across the entire organization.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
