import { env } from '@envy/env/server'
import { Resend } from 'resend'
import {
  createTransactionalEmailSender,
  type EmailSendResult
} from './email-sender'
import type { TransactionalEmailInput } from './email-templates'

const resend = new Resend(env.RESEND_API_KEY)

const sendWithResend = createTransactionalEmailSender({
  transport: async (payload) => resend.emails.send(payload),
  from: env.EMAIL_FROM,
  alertsFrom: env.EMAIL_FROM_ALERTS
})

export async function sendTransactionalEmail(
  email: TransactionalEmailInput
): Promise<EmailSendResult> {
  if (env.NODE_ENV === 'test') {
    return { data: { id: 'test-email-skipped' }, error: null }
  }

  return sendWithResend(email)
}

export type { EmailSendResult, EmailTransport } from './email-sender'
export { createTransactionalEmailSender } from './email-sender'
export type {
  EmailDataMap,
  EmailType,
  RenderedEmail,
  TransactionalEmailInput
} from './email-templates'
export {
  escapeHtml,
  formatMoney,
  renderTransactionalEmail
} from './email-templates'
