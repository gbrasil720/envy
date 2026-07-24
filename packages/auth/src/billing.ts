import { and, count, db, eq, isNotNull, isNull } from '@envy/db'
import {
  billingCustomer,
  billingEvent,
  subscription
} from '@envy/db/schema/billing'
import { member, organization } from '@envy/db/schema/organization'
import { hasRole } from '@envy/db/services'
import { env } from '@envy/env/server'
import DodoPayments from 'dodopayments'
import { sendTransactionalEmail, type TransactionalEmailInput } from './email'

export type BillingPlan = 'pro' | 'team'
export type BillingStatus =
  | 'active'
  | 'on_hold'
  | 'cancelled'
  | 'expired'
  | 'failed'

const DUNNING_WINDOW_MS = 5 * 24 * 60 * 60 * 1000

type SendEmail = (
  input: TransactionalEmailInput
) => Promise<{ data: unknown | null; error: unknown | null }>

export const dodoPayments = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT
})

function asDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

function productPlan(productId: unknown): BillingPlan | null {
  if (productId === env.DODO_PRO_PRODUCT_ID) return 'pro'
  if (productId === env.DODO_TEAM_PRODUCT_ID) return 'team'
  return null
}

function subscriptionPayload(payload: Record<string, unknown>) {
  const data = payload.data
  return data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : null
}

function organizationIdFromPayload(
  data: Record<string, unknown>
): string | null {
  const metadata = data.metadata
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).organizationId
  return typeof value === 'string' ? value : null
}

function customerIdFromPayload(data: Record<string, unknown>): string | null {
  const customer = data.customer
  if (!customer || typeof customer !== 'object') return null
  const customerId = (customer as Record<string, unknown>).customer_id
  return typeof customerId === 'string' ? customerId : null
}

function eventStatus(
  type: string,
  data: Record<string, unknown>
): BillingStatus | null {
  if (type === 'subscription.active' || type === 'subscription.renewed') {
    return 'active'
  }
  if (type === 'subscription.on_hold') return 'on_hold'
  if (type === 'subscription.cancelled') return 'cancelled'
  if (type === 'subscription.expired') return 'expired'
  if (type === 'subscription.failed') return 'failed'
  if (type === 'subscription.plan_changed' || type === 'subscription.updated') {
    const status = data.status
    return status === 'active' ||
      status === 'on_hold' ||
      status === 'cancelled' ||
      status === 'expired' ||
      status === 'failed'
      ? status
      : null
  }
  return null
}

function effectiveSeatLimit(input: {
  status: BillingStatus
  seatLimit: number
  currentPeriodEnd: Date | null
}): number {
  if (input.status === 'active') return input.seatLimit
  if (
    input.status === 'cancelled' &&
    input.currentPeriodEnd &&
    input.currentPeriodEnd > new Date()
  ) {
    return input.seatLimit
  }
  return 1
}

async function organizationEmailContext(organizationId: string) {
  const [org, members] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { id: true, name: true, slug: true }
    }),
    db.query.member.findMany({
      where: eq(member.organizationId, organizationId),
      columns: { role: true },
      with: {
        user: {
          columns: { email: true }
        }
      }
    })
  ])

  if (!org) return null
  const ownerEmails = [
    ...new Set(
      members
        .filter((entry) => hasRole(entry.role, 'owner'))
        .map((entry) => entry.user.email.toLowerCase())
    )
  ]
  return { org, ownerEmails }
}

async function sendToOwners(
  organizationId: string,
  createEmail: (
    context: NonNullable<Awaited<ReturnType<typeof organizationEmailContext>>>
  ) => Omit<TransactionalEmailInput, 'to'>,
  sendEmail: SendEmail
) {
  const context = await organizationEmailContext(organizationId)
  if (!context) return

  await Promise.all(
    context.ownerEmails.map((to) =>
      sendEmail({ ...createEmail(context), to } as TransactionalEmailInput)
    )
  )
}

export async function dispatchBillingNotification(
  input: {
    organizationId: string
    eventType: string
    status: BillingStatus | null
    data: Record<string, unknown>
    eventTimestamp: Date
  },
  sendEmail: SendEmail = sendTransactionalEmail
) {
  const appUrl = env.APP_URL.replace(/\/$/, '')
  const authUrl = env.BETTER_AUTH_URL.replace(/\/$/, '')
  const plan = productPlan(input.data.product_id)

  if (input.eventType === 'subscription.active') {
    const amountMinor = input.data.recurring_pre_tax_amount
    const currency = input.data.currency
    const currentPeriodEnd = asDate(input.data.next_billing_date)
    if (
      !plan ||
      typeof amountMinor !== 'number' ||
      typeof currency !== 'string' ||
      !currentPeriodEnd
    ) {
      return
    }

    await sendToOwners(
      input.organizationId,
      ({ org }) => ({
        type: 'subscription_activated',
        data: {
          organizationName: org.name,
          planName: plan === 'pro' ? 'Pro' : 'Team',
          amountMinor,
          currency,
          currentPeriodEnd,
          billingUrl: `${appUrl}/org/${org.slug}/settings/billing`
        }
      }),
      sendEmail
    )
    return
  }

  if (input.eventType === 'payment.failed') {
    await sendToOwners(
      input.organizationId,
      ({ org }) => ({
        type: 'payment_failed_warning',
        data: {
          organizationName: org.name,
          portalUrl: `${authUrl}/api/billing/portal?organizationId=${encodeURIComponent(org.id)}`,
          reactivateBy: new Date(
            input.eventTimestamp.getTime() + DUNNING_WINDOW_MS
          )
        }
      }),
      sendEmail
    )
    return
  }

  if (input.eventType === 'subscription.on_hold') {
    await sendToOwners(
      input.organizationId,
      ({ org }) => ({
        type: 'subscription_on_hold',
        data: {
          organizationName: org.name,
          portalUrl: `${authUrl}/api/billing/portal?organizationId=${encodeURIComponent(org.id)}`,
          reactivateBy: new Date(
            input.eventTimestamp.getTime() + DUNNING_WINDOW_MS
          )
        }
      }),
      sendEmail
    )
    return
  }

  if (input.eventType === 'subscription.cancelled') {
    const currentPeriodEnd = asDate(input.data.next_billing_date)
    if (!plan || !currentPeriodEnd) return
    await sendToOwners(
      input.organizationId,
      ({ org }) => ({
        type: 'subscription_cancelled',
        data: {
          organizationName: org.name,
          planName: plan === 'pro' ? 'Pro' : 'Team',
          currentPeriodEnd,
          billingUrl: `${appUrl}/org/${org.slug}/settings/billing`
        }
      }),
      sendEmail
    )
  }
}

export async function reconcileOrganizationReadOnlyNotification(
  organizationId: string,
  sendEmail: SendEmail = sendTransactionalEmail
) {
  const [current, memberTotal] = await Promise.all([
    db.query.subscription.findFirst({
      where: eq(subscription.organizationId, organizationId),
      columns: {
        id: true,
        status: true,
        seatLimit: true,
        currentPeriodEnd: true
      }
    }),
    db
      .select({ total: count() })
      .from(member)
      .where(eq(member.organizationId, organizationId))
      .then((rows) => rows[0]?.total ?? 0)
  ])
  if (!current) return

  const seatLimit = effectiveSeatLimit(current)
  if (memberTotal > seatLimit) {
    const [claimed] = await db
      .update(subscription)
      .set({ readOnlyNotifiedAt: new Date() })
      .where(
        and(
          eq(subscription.id, current.id),
          isNull(subscription.readOnlyNotifiedAt)
        )
      )
      .returning({ id: subscription.id })
    if (!claimed) return

    await sendToOwners(
      organizationId,
      ({ org }) => ({
        type: 'organization_read_only',
        data: {
          organizationName: org.name,
          memberCount: memberTotal,
          seatLimit,
          membersUrl: `${env.APP_URL.replace(/\/$/, '')}/org/${org.slug}/settings/members`,
          billingUrl: `${env.APP_URL.replace(/\/$/, '')}/org/${org.slug}/settings/billing`
        }
      }),
      sendEmail
    )
    return
  }

  const [cleared] = await db
    .update(subscription)
    .set({ readOnlyNotifiedAt: null })
    .where(
      and(
        eq(subscription.id, current.id),
        isNotNull(subscription.readOnlyNotifiedAt)
      )
    )
    .returning({ id: subscription.id })
  if (!cleared) return

  await sendToOwners(
    organizationId,
    ({ org }) => ({
      type: 'organization_read_only_resolved',
      data: {
        organizationName: org.name,
        memberCount: memberTotal,
        seatLimit,
        membersUrl: `${env.APP_URL.replace(/\/$/, '')}/org/${org.slug}/settings/members`
      }
    }),
    sendEmail
  )
}

export async function createCheckout(input: {
  organizationId: string
  organizationType: 'personal' | 'team'
  plan: BillingPlan
  user: { email: string; name: string }
  returnUrl: string
}) {
  if (input.plan === 'pro' && input.organizationType !== 'personal') {
    throw new Error('Pro checkout is available only for Personal organizations')
  }
  if (input.plan === 'team' && input.organizationType !== 'team') {
    throw new Error('Team checkout is available only for Team organizations')
  }

  const existing = await db.query.billingCustomer.findFirst({
    where: eq(billingCustomer.organizationId, input.organizationId),
    columns: { dodoCustomerId: true }
  })
  let customerId = existing?.dodoCustomerId
  if (!customerId) {
    const customer = await dodoPayments.customers.create(
      {
        email: input.user.email,
        name: input.user.name,
        metadata: { organizationId: input.organizationId }
      },
      { idempotencyKey: input.organizationId }
    )
    customerId = customer.customer_id
    await db.insert(billingCustomer).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      dodoCustomerId: customerId
    })
  }
  const checkout = await dodoPayments.checkoutSessions.create({
    product_cart: [
      {
        product_id:
          input.plan === 'pro'
            ? env.DODO_PRO_PRODUCT_ID
            : env.DODO_TEAM_PRODUCT_ID,
        quantity: 1
      }
    ],
    customer: { customer_id: customerId },
    metadata: { organizationId: input.organizationId },
    return_url: input.returnUrl
  })

  if (!checkout.checkout_url) {
    throw new Error('Dodo did not return a checkout URL')
  }
  return { url: checkout.checkout_url }
}

export async function createCustomerPortal(input: {
  organizationId: string
  returnUrl: string
}) {
  const current = await db.query.billingCustomer.findFirst({
    where: eq(billingCustomer.organizationId, input.organizationId),
    columns: { dodoCustomerId: true }
  })
  if (!current?.dodoCustomerId) {
    throw new Error('No Dodo customer exists for this organization')
  }
  const portal = await dodoPayments.customers.customerPortal.create(
    current.dodoCustomerId,
    { return_url: input.returnUrl }
  )
  return { url: portal.link }
}

/** Persist one signed Dodo event and apply its subscription transition once. */
export async function processDodoWebhook(
  input: {
    eventId: string
    payload: Record<string, unknown>
  },
  dependencies: { sendEmail?: SendEmail } = {}
) {
  const type = input.payload.type
  const eventType = typeof type === 'string' ? type : 'unknown'
  const data = subscriptionPayload(input.payload)
  if (!data) return { duplicate: false, handled: false }
  const eventTimestamp = asDate(input.payload.timestamp) ?? new Date()
  const sendEmail = dependencies.sendEmail ?? sendTransactionalEmail

  const dodoSubscriptionId =
    typeof data.subscription_id === 'string' ? data.subscription_id : null
  const customerId = customerIdFromPayload(data)
  let organizationId = organizationIdFromPayload(data)

  if (!organizationId && dodoSubscriptionId) {
    const existing = await db.query.subscription.findFirst({
      where: eq(subscription.dodoSubscriptionId, dodoSubscriptionId),
      columns: { organizationId: true }
    })
    organizationId = existing?.organizationId ?? null
  }
  if (!organizationId && customerId) {
    const customer = await db.query.billingCustomer.findFirst({
      where: eq(billingCustomer.dodoCustomerId, customerId),
      columns: { organizationId: true }
    })
    organizationId = customer?.organizationId ?? null
  }
  if (!organizationId && customerId) {
    const existing = await db.query.subscription.findFirst({
      where: eq(subscription.dodoCustomerId, customerId),
      columns: { organizationId: true }
    })
    organizationId = existing?.organizationId ?? null
  }

  const [recorded] = await db
    .insert(billingEvent)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      dodoEventId: input.eventId,
      eventType,
      payload: JSON.stringify(input.payload)
    })
    .onConflictDoNothing({ target: billingEvent.dodoEventId })
    .returning({ id: billingEvent.id })

  if (!recorded) return { duplicate: true, handled: false }

  if (eventType === 'payment.failed') {
    if (organizationId) {
      await dispatchBillingNotification(
        {
          organizationId,
          eventType,
          status: null,
          data,
          eventTimestamp
        },
        sendEmail
      )
    }
    await db
      .update(billingEvent)
      .set({ processedAt: new Date() })
      .where(eq(billingEvent.id, recorded.id))
    return { duplicate: false, handled: !!organizationId }
  }

  const status = eventStatus(eventType, data)
  const existing = organizationId
    ? await db.query.subscription.findFirst({
        where: eq(subscription.organizationId, organizationId),
        columns: {
          id: true,
          plan: true,
          status: true,
          dodoCustomerId: true,
          dodoProductId: true,
          seatLimit: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          canceledAt: true,
          readOnlyNotifiedAt: true
        }
      })
    : undefined
  const plan = productPlan(data.product_id) ?? existing?.plan
  const resolvedCustomerId = customerId ?? existing?.dodoCustomerId
  if (
    !organizationId ||
    !status ||
    !plan ||
    !resolvedCustomerId ||
    !dodoSubscriptionId
  ) {
    await db
      .update(billingEvent)
      .set({ processedAt: new Date() })
      .where(eq(billingEvent.id, recorded.id))
    return { duplicate: false, handled: false }
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { id: true, type: true }
  })
  if (
    !org ||
    (plan === 'pro' ? org.type !== 'personal' : org.type !== 'team')
  ) {
    await db
      .update(billingEvent)
      .set({ processedAt: new Date() })
      .where(eq(billingEvent.id, recorded.id))
    return { duplicate: false, handled: false }
  }

  const now = new Date()
  const values = {
    plan,
    status,
    dodoCustomerId: resolvedCustomerId,
    dodoSubscriptionId,
    dodoProductId:
      typeof data.product_id === 'string'
        ? data.product_id
        : (existing?.dodoProductId ?? null),
    seatLimit: plan === 'team' ? 5 : 1,
    currentPeriodStart:
      asDate(data.previous_billing_date) ??
      existing?.currentPeriodStart ??
      null,
    currentPeriodEnd:
      asDate(data.next_billing_date) ?? existing?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd:
      data.cancel_at_next_billing_date === true
        ? asDate(data.next_billing_date)
        : (existing?.cancelAtPeriodEnd ?? null),
    canceledAt:
      status === 'cancelled'
        ? (asDate(data.cancelled_at) ?? now)
        : (existing?.canceledAt ?? null),
    readOnlyNotifiedAt: existing?.readOnlyNotifiedAt ?? null,
    updatedAt: now
  }
  if (existing) {
    await db
      .update(subscription)
      .set(values)
      .where(eq(subscription.id, existing.id))
  } else {
    await db.insert(subscription).values({
      id: crypto.randomUUID(),
      organizationId,
      ...values,
      createdAt: now
    })
  }
  await db
    .insert(billingCustomer)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      dodoCustomerId: resolvedCustomerId
    })
    .onConflictDoNothing({ target: billingCustomer.organizationId })
  await db
    .update(billingEvent)
    .set({ processedAt: new Date() })
    .where(
      and(
        eq(billingEvent.id, recorded.id),
        eq(billingEvent.dodoEventId, input.eventId)
      )
    )
  await dispatchBillingNotification(
    {
      organizationId,
      eventType,
      status,
      data,
      eventTimestamp
    },
    sendEmail
  )
  await reconcileOrganizationReadOnlyNotification(organizationId, sendEmail)
  return { duplicate: false, handled: true }
}
