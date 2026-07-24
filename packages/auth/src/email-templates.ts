export type EmailDataMap = {
  organization_invitation: {
    organizationName: string
    inviterName: string
    inviterEmail: string
    role: string
    acceptUrl: string
    expiresAt: Date
  }
  invitation_accepted: {
    organizationName: string
    acceptedName: string
    membersUrl: string
  }
  member_removed: {
    organizationName: string
    appUrl: string
  }
  subscription_activated: {
    organizationName: string
    planName: string
    amountMinor: number
    currency: string
    currentPeriodEnd: Date
    billingUrl: string
  }
  payment_failed_warning: {
    organizationName: string
    portalUrl: string
    reactivateBy: Date
  }
  subscription_on_hold: {
    organizationName: string
    portalUrl: string
    reactivateBy: Date
  }
  subscription_cancelled: {
    organizationName: string
    planName: string
    currentPeriodEnd: Date
    billingUrl: string
  }
  organization_read_only: {
    organizationName: string
    memberCount: number
    seatLimit: number
    membersUrl: string
    billingUrl: string
  }
  organization_read_only_resolved: {
    organizationName: string
    memberCount: number
    seatLimit: number
    membersUrl: string
  }
}

export type EmailType = keyof EmailDataMap

export type TransactionalEmailInput = {
  [Type in EmailType]: {
    type: Type
    to: string
    data: EmailDataMap[Type]
  }
}[EmailType]

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

type EmailContent = {
  label: string
  subject: string
  preheader: string
  heading: string
  intro: string
  details?: Array<[string, string]>
  action?: { label: string; url: string }
  secondaryAction?: { label: string; url: string }
  note: string
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC'
})

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC'
})

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function formatMoney(amountMinor: number, currency: string): string {
  const normalizedCurrency = currency.toUpperCase()
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency
  })
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(amountMinor / 10 ** fractionDigits)
}

function formatDateTime(date: Date): string {
  return `${DATE_TIME_FORMATTER.format(date)} UTC`
}

function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date)
}

function renderDetails(details: Array<[string, string]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td bgcolor="#141514" style="background-color:#141514;border:1px solid #2a2b2a;border-radius:4px;padding:16px 18px;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:22px;color:#eeefee">${details
    .map(
      ([label, value]) =>
        `<span style="color:#6b6c6b">${escapeHtml(label.padEnd(11, '\u00a0'))}</span>${escapeHtml(value)}`
    )
    .join('<br>')}</td></tr></table>`
}

function renderAction(action: { label: string; url: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:4px;background-color:#eeefee"><a href="${escapeHtml(action.url)}" style="display:block;padding:13px 32px;border-radius:4px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;background-color:#eeefee;color:#0b0c0b;border:1px solid #eeefee">${escapeHtml(action.label)}</a></td></tr></table>`
}

function renderShell(content: EmailContent): string {
  const details = content.details ? renderDetails(content.details) : ''
  const action = content.action ? renderAction(content.action) : ''
  const secondaryAction = content.secondaryAction
    ? `<p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b6c6b"><a href="${escapeHtml(content.secondaryAction.url)}" style="color:#9a9b9a;text-decoration:underline">${escapeHtml(content.secondaryAction.label)}</a></p>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(content.subject)} — envy</title>
<!--[if mso]><style>table,td,a,span{font-family:Helvetica,Arial,sans-serif !important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0b0c0b;-webkit-text-size-adjust:100%">
<span style="display:none;font-size:1px;color:#0b0c0b;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(content.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0b0c0b" style="background-color:#0b0c0b">
<tr><td align="center" style="padding:48px 20px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px">
<tr><td style="padding:0 0 18px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td align="left" style="font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:bold;color:#eeefee">envy<span style="color:#3dd68c;font-family:Helvetica,Arial,sans-serif">*</span></td>
<td align="right" style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#6b6c6b">// ${escapeHtml(content.label)}</td>
</tr></table>
</td></tr>
<tr><td bgcolor="#0d0e0d" style="background-color:#0d0e0d;border:1px solid #2a2b2a;border-radius:6px;padding:36px">
<h1 style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:bold;color:#eeefee;letter-spacing:-0.3px">${escapeHtml(content.heading)}<span style="color:#3dd68c">.</span></h1>
<p style="margin:0 0 24px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#9a9b9a">${escapeHtml(content.intro)}</p>
${details}
${details && action ? '<div style="height:24px;line-height:24px;font-size:1px">&nbsp;</div>' : ''}
${action}
${secondaryAction}
<p style="margin:24px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b6c6b">${escapeHtml(content.note)}</p>
</td></tr>
<tr><td style="padding:18px 4px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td align="left" style="font-family:'Courier New',Courier,monospace;font-size:10px;line-height:16px;color:#6b6c6b">AES-256-GCM at rest &middot; audit on every read</td>
<td align="right" style="font-family:'Courier New',Courier,monospace;font-size:10px;line-height:16px;color:#6b6c6b"><a href="https://useenvy.dev" style="color:#6b6c6b;text-decoration:underline">useenvy.dev</a></td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function renderText(content: EmailContent): string {
  const details =
    content.details?.map(([label, value]) => `${label}: ${value}`).join('\n') ??
    ''
  const actions = [content.action, content.secondaryAction]
    .filter((action): action is { label: string; url: string } => !!action)
    .map((action) => `${action.label}: ${action.url}`)
    .join('\n')

  return [`${content.heading}.`, content.intro, details, actions, content.note]
    .filter(Boolean)
    .join('\n\n')
}

function finalize(content: EmailContent): RenderedEmail {
  return {
    subject: content.subject,
    html: renderShell(content),
    text: renderText(content)
  }
}

export function renderTransactionalEmail(
  input: TransactionalEmailInput
): RenderedEmail {
  switch (input.type) {
    case 'organization_invitation': {
      const { data } = input
      const inviter = data.inviterName || data.inviterEmail
      return finalize({
        label: 'invite',
        subject: `You’re invited to ${data.organizationName}`,
        preheader: `${inviter} invited you to join ${data.organizationName} on envy.`,
        heading: 'You’ve been invited',
        intro: `${inviter} invited you to join the ${data.organizationName} organization on envy — shared secrets without .env files in Slack.`,
        details: [
          ['organization', data.organizationName],
          ['role', data.role],
          ['expires', formatDateTime(data.expiresAt)]
        ],
        action: { label: 'Review invitation', url: data.acceptUrl },
        note: 'Don’t know this organization? Ignore this email. The invitation expires on its own.'
      })
    }
    case 'invitation_accepted': {
      const { data } = input
      return finalize({
        label: 'member joined',
        subject: `${data.acceptedName} joined ${data.organizationName}`,
        preheader: `${data.acceptedName} accepted your invitation.`,
        heading: 'Invitation accepted',
        intro: `${data.acceptedName} accepted the invitation and now has access to ${data.organizationName}.`,
        action: { label: 'View members', url: data.membersUrl },
        note: 'Nothing else to do. The organization membership is already live.'
      })
    }
    case 'member_removed': {
      const { data } = input
      return finalize({
        label: 'membership',
        subject: `Access removed from ${data.organizationName}`,
        preheader: `Your access to ${data.organizationName} has been removed.`,
        heading: 'Organization access removed',
        intro: `You no longer have access to ${data.organizationName} or its projects in envy.`,
        action: { label: 'Open envy', url: data.appUrl },
        note: 'This message only confirms the membership change. Contact an organization admin if you think it was a mistake.'
      })
    }
    case 'subscription_activated': {
      const { data } = input
      return finalize({
        label: 'billing',
        subject: `${data.planName} is active for ${data.organizationName}`,
        preheader: `Your ${data.planName} subscription is active.`,
        heading: 'Subscription active',
        intro: `${data.organizationName} is now running on the ${data.planName} plan.`,
        details: [
          ['plan', data.planName],
          ['charged', formatMoney(data.amountMinor, data.currency)],
          ['renews', formatDate(data.currentPeriodEnd)]
        ],
        action: { label: 'Manage billing', url: data.billingUrl },
        note: 'The plan limits are active now. No cache-clearing ritual required.'
      })
    }
    case 'payment_failed_warning': {
      const { data } = input
      return finalize({
        label: 'billing alert',
        subject: `Payment failed for ${data.organizationName}`,
        preheader:
          'Update the payment method before the subscription is suspended.',
        heading: 'Payment failed',
        intro: `The latest charge for ${data.organizationName} did not go through. Update the payment method before dunning runs out.`,
        details: [
          ['status', 'payment failed'],
          ['deadline', formatDateTime(data.reactivateBy)]
        ],
        action: { label: 'Update payment method', url: data.portalUrl },
        note: 'Dodo Payments retries for five days. After that deadline, paid access may be suspended.'
      })
    }
    case 'subscription_on_hold': {
      const { data } = input
      return finalize({
        label: 'urgent billing',
        subject: `Action needed: ${data.organizationName} is suspended`,
        preheader:
          'Your subscription is on hold. Five days remain to reactivate it.',
        heading: 'Subscription on hold',
        intro: `${data.organizationName} is suspended after a failed payment. Update the payment method to reactivate the subscription.`,
        details: [
          ['status', 'on hold'],
          ['deadline', formatDateTime(data.reactivateBy)]
        ],
        action: { label: 'Reactivate subscription', url: data.portalUrl },
        note: 'The five-day dunning window ends at the deadline above. The data stays intact; paid access does not.'
      })
    }
    case 'subscription_cancelled': {
      const { data } = input
      return finalize({
        label: 'billing',
        subject: `${data.planName} cancelled for ${data.organizationName}`,
        preheader: `Paid access remains active through ${formatDate(data.currentPeriodEnd)}.`,
        heading: 'Subscription cancelled',
        intro: `The ${data.planName} subscription for ${data.organizationName} will not renew.`,
        details: [
          ['plan', data.planName],
          ['access until', formatDate(data.currentPeriodEnd)]
        ],
        action: { label: 'View billing', url: data.billingUrl },
        note: 'Paid access stays active through the date above. Cancellation does not delete organizations, projects, or secrets.'
      })
    }
    case 'organization_read_only': {
      const { data } = input
      const overLimit = Math.max(0, data.memberCount - data.seatLimit)
      return finalize({
        label: 'read only',
        subject: `${data.organizationName} is now read-only`,
        preheader: `${overLimit} member${overLimit === 1 ? '' : 's'} over the current plan limit.`,
        heading: 'Organization is read-only',
        intro: `${data.organizationName} has more members than the current plan allows. Reads still work; writes are paused.`,
        details: [
          ['members', String(data.memberCount)],
          ['seat limit', String(data.seatLimit)],
          ['over limit', String(overLimit)]
        ],
        action: { label: 'Manage members', url: data.membersUrl },
        secondaryAction: { label: 'Or upgrade the plan', url: data.billingUrl },
        note: 'Remove enough members or upgrade the plan. Write access returns automatically when usage is back within the limit.'
      })
    }
    case 'organization_read_only_resolved': {
      const { data } = input
      return finalize({
        label: 'resolved',
        subject: `Write access restored for ${data.organizationName}`,
        preheader: 'The organization is back within its seat limit.',
        heading: 'Write access restored',
        intro: `${data.organizationName} is within the current plan limit again. Normal write access has resumed.`,
        details: [
          ['members', String(data.memberCount)],
          ['seat limit', String(data.seatLimit)],
          ['status', 'writable']
        ],
        action: { label: 'View members', url: data.membersUrl },
        note: 'No restart required. The organization is writable now.'
      })
    }
  }
}
