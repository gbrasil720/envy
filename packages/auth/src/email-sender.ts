import {
  type EmailType,
  renderTransactionalEmail,
  type TransactionalEmailInput
} from './email-templates'

type EmailSendPayload = {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

export type EmailSendResult = {
  data: unknown | null
  error: unknown | null
}

export type EmailTransport = (
  payload: EmailSendPayload
) => Promise<EmailSendResult>

const ALERT_TYPES = new Set<EmailType>([
  'payment_failed_warning',
  'subscription_on_hold',
  'organization_read_only'
])

export function createTransactionalEmailSender(input: {
  transport: EmailTransport
  from: string
  alertsFrom: string
  logger?: Pick<Console, 'error'>
}) {
  const logger = input.logger ?? console

  return async function sendTransactionalEmail(
    email: TransactionalEmailInput
  ): Promise<EmailSendResult> {
    const rendered = renderTransactionalEmail(email)

    try {
      const result = await input.transport({
        from: ALERT_TYPES.has(email.type) ? input.alertsFrom : input.from,
        to: email.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text
      })

      if (result.error) {
        logger.error(
          `[email] failed to send '${email.type}' to ${email.to}:`,
          result.error
        )
      }

      return result
    } catch (error) {
      logger.error(
        `[email] failed to send '${email.type}' to ${email.to}:`,
        error
      )
      return { data: null, error }
    }
  }
}
