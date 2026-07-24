/** Pure audit action catalog — safe for web and server. */

export const AUDIT_ACTIONS = [
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted',
  'environment_created',
  'environment_renamed',
  'environment_deleted',
  'member_invited',
  'invitation_reinvited',
  'invitation_accepted',
  'invitation_cancelled',
  'invitation_expired',
  'member_removed'
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const SECRET_AUDIT_ACTIONS = new Set<string>([
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted'
])

export const MEMBER_AUDIT_ACTIONS = new Set<string>([
  'member_invited',
  'invitation_reinvited',
  'invitation_accepted',
  'invitation_cancelled',
  'invitation_expired',
  'member_removed'
])

export const CLI_AUDIT_ACTIONS = new Set<string>(['pushed', 'revealed'])

/** UI-agnostic label map: verb + semantic tone. Web maps tone → CSS. */
export const AUDIT_ACTION_LABELS: Record<
  AuditAction,
  { verb: string; tone: 'brand' | 'info' | 'warning' | 'danger' | 'muted' }
> = {
  pushed: { verb: 'pushed', tone: 'brand' },
  revealed: { verb: 'revealed', tone: 'warning' },
  secrets_updated: { verb: 'changed', tone: 'info' },
  secrets_deleted: { verb: 'deleted', tone: 'danger' },
  environment_created: { verb: 'created env', tone: 'brand' },
  environment_renamed: { verb: 'renamed env', tone: 'info' },
  environment_deleted: { verb: 'deleted env', tone: 'danger' },
  member_invited: { verb: 'invited', tone: 'info' },
  invitation_reinvited: { verb: 're-invited', tone: 'info' },
  invitation_accepted: { verb: 'accepted invite', tone: 'brand' },
  invitation_cancelled: { verb: 'canceled invite', tone: 'danger' },
  invitation_expired: { verb: 'expired invite', tone: 'muted' },
  member_removed: { verb: 'removed', tone: 'danger' }
}
