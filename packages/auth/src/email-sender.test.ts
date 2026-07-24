import { describe, expect, mock, test } from 'bun:test'
import { createTransactionalEmailSender } from './email-sender'

const invitation = {
  type: 'organization_invitation' as const,
  to: 'invitee@test.local',
  data: {
    organizationName: 'Acme',
    inviterName: 'Grace',
    inviterEmail: 'grace@test.local',
    role: 'member',
    acceptUrl: 'https://useenvy.dev/accept-invitation/inv_1',
    expiresAt: new Date('2026-08-01T12:30:00.000Z')
  }
}

describe('transactional email sender', () => {
  test('uses regular and alert senders by email type', async () => {
    const payloads: Array<{ from: string; to: string }> = []
    const send = createTransactionalEmailSender({
      transport: async (payload) => {
        payloads.push({ from: payload.from, to: payload.to })
        return { data: { id: 'email_1' }, error: null }
      },
      from: 'Envy <noreply@test.local>',
      alertsFrom: 'Envy <alerts@test.local>'
    })

    await send(invitation)
    await send({
      type: 'organization_read_only',
      to: 'owner@test.local',
      data: {
        organizationName: 'Acme',
        memberCount: 2,
        seatLimit: 1,
        membersUrl: 'https://useenvy.dev/members',
        billingUrl: 'https://useenvy.dev/billing'
      }
    })

    expect(payloads).toEqual([
      {
        from: 'Envy <noreply@test.local>',
        to: 'invitee@test.local'
      },
      {
        from: 'Envy <alerts@test.local>',
        to: 'owner@test.local'
      }
    ])
  })

  test('logs provider errors and never throws', async () => {
    const error = new Error('provider unavailable')
    const logger = { error: mock(() => undefined) }
    const send = createTransactionalEmailSender({
      transport: async () => {
        throw error
      },
      from: 'regular@test.local',
      alertsFrom: 'alerts@test.local',
      logger
    })

    await expect(send(invitation)).resolves.toEqual({
      data: null,
      error
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  test('logs errors returned by the provider', async () => {
    const providerError = { message: 'rejected' }
    const logger = { error: mock(() => undefined) }
    const send = createTransactionalEmailSender({
      transport: async () => ({ data: null, error: providerError }),
      from: 'regular@test.local',
      alertsFrom: 'alerts@test.local',
      logger
    })

    await expect(send(invitation)).resolves.toEqual({
      data: null,
      error: providerError
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
