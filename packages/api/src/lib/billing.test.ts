import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import {
  processDodoWebhook,
  reconcileOrganizationReadOnlyNotification
} from '@envy/auth/billing'
import type { TransactionalEmailInput } from '@envy/auth/email'
import { eq } from '@envy/db'
import { billingEvent, subscription } from '@envy/db/schema/billing'
import { member } from '@envy/db/schema/organization'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import { addMember, createTestProject, createTestUser } from '../test/factories'

function subscriptionEvent(input: {
  organizationId: string
  type: string
  status?: string
}) {
  return {
    type: input.type,
    timestamp: '2026-01-02T00:00:00.000Z',
    data: {
      subscription_id: 'sub_dodo_test',
      product_id: 'pdt_pro',
      customer: { customer_id: 'cus_dodo_test' },
      metadata: { organizationId: input.organizationId },
      status: input.status ?? 'active',
      currency: 'USD',
      recurring_pre_tax_amount: 1900,
      previous_billing_date: '2026-01-01T00:00:00.000Z',
      next_billing_date: '2026-02-01T00:00:00.000Z',
      cancel_at_next_billing_date: false
    }
  }
}

function paymentFailedEvent(organizationId: string) {
  return {
    type: 'payment.failed',
    timestamp: '2026-01-03T00:00:00.000Z',
    data: {
      payment_id: 'pay_failed',
      subscription_id: 'sub_dodo_test',
      customer: { customer_id: 'cus_dodo_test' },
      metadata: { organizationId },
      currency: 'USD',
      total_amount: 1900
    }
  }
}

function emailCollector() {
  const emails: TransactionalEmailInput[] = []
  return {
    emails,
    sendEmail: async (email: TransactionalEmailInput) => {
      emails.push(email)
      return { data: { id: `email_${emails.length}` }, error: null }
    }
  }
}

describe('Dodo billing webhook service', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('records a verified event once and ignores an exact replay', async () => {
    const owner = await createTestUser()
    const project = await createTestProject(owner.id, 'Billing Project')
    const payload = subscriptionEvent({
      organizationId: project.organizationId,
      type: 'subscription.active'
    })

    const collector = emailCollector()
    expect(
      await processDodoWebhook(
        { eventId: 'evt_1', payload },
        { sendEmail: collector.sendEmail }
      )
    ).toEqual({
      duplicate: false,
      handled: true
    })
    expect(
      await processDodoWebhook(
        { eventId: 'evt_1', payload },
        { sendEmail: collector.sendEmail }
      )
    ).toEqual({
      duplicate: true,
      handled: false
    })

    const db = getTestDb()
    const events = await db.select().from(billingEvent)
    const [current] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.organizationId, project.organizationId))
    expect(events).toHaveLength(1)
    expect(events[0]?.processedAt).toBeInstanceOf(Date)
    expect(current?.plan).toBe('pro')
    expect(current?.status).toBe('active')
    expect(current?.dodoProductId).toBe('pdt_pro')
    expect(collector.emails.map((email) => email.type)).toEqual([
      'subscription_activated'
    ])
  })

  test('moves an existing subscription to on_hold', async () => {
    const owner = await createTestUser()
    const project = await createTestProject(owner.id, 'Dunning Project')
    await processDodoWebhook({
      eventId: 'evt_active',
      payload: subscriptionEvent({
        organizationId: project.organizationId,
        type: 'subscription.active'
      })
    })
    await processDodoWebhook({
      eventId: 'evt_hold',
      payload: subscriptionEvent({
        organizationId: project.organizationId,
        type: 'subscription.on_hold',
        status: 'on_hold'
      })
    })

    const [current] = await getTestDb()
      .select({ status: subscription.status })
      .from(subscription)
      .where(eq(subscription.organizationId, project.organizationId))
    expect(current?.status).toBe('on_hold')
  })

  test('payment.failed warns once without changing subscription status', async () => {
    const owner = await createTestUser()
    const project = await createTestProject(owner.id, 'Payment Failure')
    await processDodoWebhook({
      eventId: 'evt_active',
      payload: subscriptionEvent({
        organizationId: project.organizationId,
        type: 'subscription.active'
      })
    })

    const collector = emailCollector()
    const payload = paymentFailedEvent(project.organizationId)
    await processDodoWebhook(
      { eventId: 'evt_payment_failed', payload },
      { sendEmail: collector.sendEmail }
    )
    await processDodoWebhook(
      { eventId: 'evt_payment_failed', payload },
      { sendEmail: collector.sendEmail }
    )

    const current = await getTestDb().query.subscription.findFirst({
      where: eq(subscription.organizationId, project.organizationId),
      columns: { status: true }
    })
    expect(current?.status).toBe('active')
    expect(collector.emails.map((email) => email.type)).toEqual([
      'payment_failed_warning'
    ])
  })

  test('notifies every owner exactly once', async () => {
    const firstOwner = await createTestUser()
    const secondOwner = await createTestUser({
      email: 'second-owner@test.local'
    })
    const project = await createTestProject(firstOwner.id, 'Multiple Owners')
    await addMember({
      organizationId: project.organizationId,
      userId: secondOwner.id,
      role: 'admin,owner'
    })
    const collector = emailCollector()

    await processDodoWebhook(
      {
        eventId: 'evt_multi_owner',
        payload: subscriptionEvent({
          organizationId: project.organizationId,
          type: 'subscription.active'
        })
      },
      { sendEmail: collector.sendEmail }
    )

    for (const type of [
      'subscription_activated',
      'organization_read_only'
    ] as const) {
      expect(
        collector.emails
          .filter((email) => email.type === type)
          .map((email) => email.to)
          .toSorted()
      ).toEqual([firstOwner.email, secondOwner.email].toSorted())
    }
  })

  test('read-only notification is transition-based and resolves once', async () => {
    const owner = await createTestUser()
    const extra = await createTestUser({ email: 'extra@test.local' })
    const project = await createTestProject(owner.id, 'Read Only')
    await processDodoWebhook({
      eventId: 'evt_active',
      payload: subscriptionEvent({
        organizationId: project.organizationId,
        type: 'subscription.active'
      })
    })
    const extraMember = await addMember({
      organizationId: project.organizationId,
      userId: extra.id
    })
    const collector = emailCollector()
    const onHold = subscriptionEvent({
      organizationId: project.organizationId,
      type: 'subscription.on_hold',
      status: 'on_hold'
    })

    await processDodoWebhook(
      { eventId: 'evt_hold_1', payload: onHold },
      { sendEmail: collector.sendEmail }
    )
    await processDodoWebhook(
      { eventId: 'evt_hold_2', payload: onHold },
      { sendEmail: collector.sendEmail }
    )

    expect(
      collector.emails.filter(
        (email) => email.type === 'organization_read_only'
      )
    ).toHaveLength(1)
    const flagged = await getTestDb().query.subscription.findFirst({
      where: eq(subscription.organizationId, project.organizationId),
      columns: { readOnlyNotifiedAt: true }
    })
    expect(flagged?.readOnlyNotifiedAt).toBeInstanceOf(Date)

    await getTestDb().delete(member).where(eq(member.id, extraMember.id))
    await reconcileOrganizationReadOnlyNotification(
      project.organizationId,
      collector.sendEmail
    )
    await reconcileOrganizationReadOnlyNotification(
      project.organizationId,
      collector.sendEmail
    )

    expect(
      collector.emails.filter(
        (email) => email.type === 'organization_read_only_resolved'
      )
    ).toHaveLength(1)
    const resolved = await getTestDb().query.subscription.findFirst({
      where: eq(subscription.organizationId, project.organizationId),
      columns: { readOnlyNotifiedAt: true }
    })
    expect(resolved?.readOnlyNotifiedAt).toBeNull()
  })

  test('subscription.cancelled includes the real paid-through date', async () => {
    const owner = await createTestUser()
    const project = await createTestProject(owner.id, 'Cancellation')
    await processDodoWebhook({
      eventId: 'evt_active',
      payload: subscriptionEvent({
        organizationId: project.organizationId,
        type: 'subscription.active'
      })
    })
    const collector = emailCollector()
    await processDodoWebhook(
      {
        eventId: 'evt_cancelled',
        payload: subscriptionEvent({
          organizationId: project.organizationId,
          type: 'subscription.cancelled',
          status: 'cancelled'
        })
      },
      { sendEmail: collector.sendEmail }
    )

    const cancelled = collector.emails.find(
      (email) => email.type === 'subscription_cancelled'
    )
    expect(cancelled?.type).toBe('subscription_cancelled')
    if (cancelled?.type === 'subscription_cancelled') {
      expect(cancelled.data.currentPeriodEnd).toEqual(
        new Date('2026-02-01T00:00:00.000Z')
      )
    }
  })
})
