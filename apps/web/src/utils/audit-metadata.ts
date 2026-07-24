export type AuditContextItem = {
  label: string
  value: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function formatAuditMetadata(
  action: string,
  metadata: unknown
): AuditContextItem[] {
  if (!isRecord(metadata)) return []

  const items: AuditContextItem[] = []
  const count = metadata.count
  if (
    ['pushed', 'secrets_updated', 'secrets_deleted'].includes(action) &&
    typeof count === 'number' &&
    Number.isFinite(count)
  ) {
    items.push({ label: 'Secret count', value: String(count) })
  }

  const oldName = stringValue(metadata.oldName)
  if (
    oldName &&
    ['environment_renamed', 'project_renamed', 'organization_renamed'].includes(
      action
    )
  ) {
    items.push({
      label:
        action === 'environment_renamed'
          ? 'Previous environment'
          : 'Previous name',
      value: oldName
    })
  }

  const newName = stringValue(metadata.newName)
  if (newName && ['project_renamed', 'organization_renamed'].includes(action)) {
    items.push({ label: 'New name', value: newName })
  }

  const role = stringValue(metadata.role)
  if (
    role &&
    [
      'member_invited',
      'invitation_reinvited',
      'invitation_accepted',
      'invitation_cancelled',
      'invitation_expired',
      'member_removed'
    ].includes(action)
  ) {
    items.push({ label: 'Role', value: role })
  }

  if (action === 'member_removed') {
    const removedName = stringValue(metadata.removedName)
    const removedMemberId = stringValue(metadata.removedMemberId)
    const removedUserId = stringValue(metadata.removedUserId)
    if (removedName) {
      items.push({ label: 'Removed member', value: removedName })
    }
    if (removedMemberId) {
      items.push({ label: 'Removed member ID', value: removedMemberId })
    }
    if (removedUserId) {
      items.push({ label: 'Removed user ID', value: removedUserId })
    }
  }

  return items
}
