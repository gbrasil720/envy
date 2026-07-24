import { describe, expect, test } from 'bun:test'
import { formatAuditMetadata } from './audit-metadata'

describe('formatAuditMetadata', () => {
  test('formats only approved fields for the matching action', () => {
    expect(
      formatAuditMetadata('member_removed', {
        removedName: 'Ada',
        removedMemberId: 'member-1',
        removedUserId: 'user-1',
        role: 'admin',
        accessToken: 'never-render-this'
      })
    ).toEqual([
      { label: 'Role', value: 'admin' },
      { label: 'Removed member', value: 'Ada' },
      { label: 'Removed member ID', value: 'member-1' },
      { label: 'Removed user ID', value: 'user-1' }
    ])
  })

  test('does not render arbitrary or mismatched metadata', () => {
    expect(
      formatAuditMetadata('revealed', {
        token: 'secret',
        role: 'owner',
        oldName: 'production'
      })
    ).toEqual([])
  })

  test('formats rename and count context', () => {
    expect(
      formatAuditMetadata('environment_renamed', { oldName: 'preview' })
    ).toEqual([{ label: 'Previous environment', value: 'preview' }])
    expect(formatAuditMetadata('pushed', { count: 3 })).toEqual([
      { label: 'Secret count', value: '3' }
    ])
  })
})
