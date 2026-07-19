import { auditLog } from '@envy/db/schema/envy'
import type { Context } from '../context'
import type { AuditAction } from './audit-actions'

export type { AuditAction } from './audit-actions'
export { AUDIT_ACTIONS, SECRET_AUDIT_ACTIONS } from './audit-actions'

type DbLike = {
  insert: Context['db']['insert']
}

export type RecordAuditInput = {
  projectId: string
  userId: string
  action: AuditAction
  environment?: string | null
  targetKey?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordAudit(
  db: DbLike,
  input: RecordAuditInput
): Promise<void> {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    userId: input.userId,
    environment: input.environment ?? null,
    action: input.action,
    targetKey: input.targetKey ?? null,
    metadata: input.metadata ?? null,
    createdAt: new Date()
  })
}
