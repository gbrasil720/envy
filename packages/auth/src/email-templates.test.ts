import { describe, expect, test } from 'bun:test'
import {
  formatMoney,
  renderTransactionalEmail,
  type TransactionalEmailInput
} from './email-templates'

const now = new Date('2026-08-01T12:30:00.000Z')
const url = 'https://useenvy.dev/org/acme/settings'

const everyEmailType = [
  {
    type: 'organization_invitation',
    to: 'member@test.local',
    data: {
      organizationName: 'Acme',
      inviterName: 'Grace',
      inviterEmail: 'grace@test.local',
      role: 'member',
      acceptUrl: url,
      expiresAt: now
    }
  },
  {
    type: 'invitation_accepted',
    to: 'owner@test.local',
    data: {
      organizationName: 'Acme',
      acceptedName: 'Lin',
      membersUrl: url
    }
  },
  {
    type: 'member_removed',
    to: 'member@test.local',
    data: { organizationName: 'Acme', appUrl: url }
  },
  {
    type: 'subscription_activated',
    to: 'owner@test.local',
    data: {
      organizationName: 'Acme',
      planName: 'Team',
      amountMinor: 4900,
      currency: 'USD',
      currentPeriodEnd: now,
      billingUrl: url
    }
  },
  {
    type: 'payment_failed_warning',
    to: 'owner@test.local',
    data: { organizationName: 'Acme', portalUrl: url, reactivateBy: now }
  },
  {
    type: 'subscription_on_hold',
    to: 'owner@test.local',
    data: { organizationName: 'Acme', portalUrl: url, reactivateBy: now }
  },
  {
    type: 'subscription_cancelled',
    to: 'owner@test.local',
    data: {
      organizationName: 'Acme',
      planName: 'Team',
      currentPeriodEnd: now,
      billingUrl: url
    }
  },
  {
    type: 'organization_read_only',
    to: 'owner@test.local',
    data: {
      organizationName: 'Acme',
      memberCount: 2,
      seatLimit: 1,
      membersUrl: url,
      billingUrl: url
    }
  },
  {
    type: 'organization_read_only_resolved',
    to: 'owner@test.local',
    data: {
      organizationName: 'Acme',
      memberCount: 1,
      seatLimit: 1,
      membersUrl: url
    }
  }
] satisfies TransactionalEmailInput[]

describe('transactional email templates', () => {
  test('renders HTML and plain text for every supported email type', () => {
    expect(everyEmailType).toHaveLength(9)

    for (const input of everyEmailType) {
      const rendered = renderTransactionalEmail(input)
      expect(rendered.subject.length).toBeGreaterThan(0)
      expect(rendered.html).toContain('<!doctype html>')
      expect(rendered.html).toContain('envy')
      expect(rendered.text.length).toBeGreaterThan(0)
    }
  })

  test('renders invitation data and escapes user-controlled content', () => {
    const rendered = renderTransactionalEmail({
      type: 'organization_invitation',
      to: 'invitee@test.local',
      data: {
        organizationName: '<Acme & Co>',
        inviterName: 'Grace "Hopper"',
        inviterEmail: 'grace@test.local',
        role: 'admin',
        acceptUrl: 'https://useenvy.dev/accept-invitation/inv_1?from=a&to=b',
        expiresAt: new Date('2026-08-01T12:30:00.000Z')
      }
    })

    expect(rendered.subject).toBe('You’re invited to <Acme & Co>')
    expect(rendered.html).toContain('&lt;Acme &amp; Co&gt;')
    expect(rendered.html).toContain('Grace &quot;Hopper&quot;')
    expect(rendered.html).toContain(
      'https://useenvy.dev/accept-invitation/inv_1?from=a&amp;to=b'
    )
    expect(rendered.text).toContain('August 1, 2026 at 12:30 PM UTC')
  })

  test('formats currencies using their ISO minor units', () => {
    expect(formatMoney(1299, 'usd')).toBe('$12.99')
    expect(formatMoney(1299, 'jpy')).toBe('¥1,299')
  })

  test('renders exact billing and read-only values', () => {
    const activated = renderTransactionalEmail({
      type: 'subscription_activated',
      to: 'owner@test.local',
      data: {
        organizationName: 'Acme',
        planName: 'Team',
        amountMinor: 4900,
        currency: 'USD',
        currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        billingUrl: 'https://useenvy.dev/org/acme/settings/billing'
      }
    })
    const readOnly = renderTransactionalEmail({
      type: 'organization_read_only',
      to: 'owner@test.local',
      data: {
        organizationName: 'Acme',
        memberCount: 7,
        seatLimit: 5,
        membersUrl: 'https://useenvy.dev/org/acme/settings/members',
        billingUrl: 'https://useenvy.dev/org/acme/settings/billing'
      }
    })

    expect(activated.html).toContain('$49.00')
    expect(activated.html).toContain('September 1, 2026')
    expect(readOnly.text).toContain('over limit: 2')
    expect(readOnly.text).toContain('Manage members:')
    expect(readOnly.text).toContain('Or upgrade the plan:')
  })
})
