/** Pure audit action catalog — safe for web and server. */

export const AUDIT_ACTIONS = [
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted',
  'environment_created',
  'environment_renamed',
  'environment_deleted'
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const SECRET_AUDIT_ACTIONS = new Set<string>([
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted'
])
