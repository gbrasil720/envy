import { verifyWebhookPayload } from '@dodopayments/core/webhook'
import { APIError, createAuthEndpoint } from 'better-auth/api'

/**
 * Local upstream-compatible patch for @dodopayments/better-auth's webhooks()
 * sub-plugin. The adapter verifies the signature before invoking this callback;
 * this patch additionally forwards that verified webhook-id for durable replay
 * protection. Remove it once the upstream handler exposes webhook-id itself.
 */
export function webhooksWithEventId(input: {
  webhookKey: string
  onPayload: (
    payload: Record<string, unknown>,
    eventId: string
  ) => Promise<void>
}) {
  return () => ({
    dodopaymentsWebhooks: createAuthEndpoint(
      '/dodopayments/webhooks',
      { method: 'POST', metadata: { isAction: false }, cloneRequest: true },
      async (ctx) => {
        if (!ctx.request) {
          throw new APIError('BAD_REQUEST', { message: 'Missing request' })
        }
        const request = ctx.request
        const body = await request.text()
        const eventId = request.headers.get('webhook-id')
        if (!eventId) {
          throw new APIError('BAD_REQUEST', { message: 'Missing webhook-id' })
        }
        try {
          const payload = await verifyWebhookPayload({
            webhookKey: input.webhookKey,
            headers: {
              'webhook-id': eventId,
              'webhook-timestamp':
                request.headers.get('webhook-timestamp') ?? '',
              'webhook-signature':
                request.headers.get('webhook-signature') ?? ''
            },
            body
          })
          await input.onPayload(
            payload as unknown as Record<string, unknown>,
            eventId
          )
          return ctx.json({ received: true })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Webhook error'
          throw new APIError('BAD_REQUEST', { message })
        }
      }
    )
  })
}
