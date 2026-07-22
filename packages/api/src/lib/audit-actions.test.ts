import { describe, expect, test } from 'bun:test'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  CLI_AUDIT_ACTIONS,
  MEMBER_AUDIT_ACTIONS,
  SECRET_AUDIT_ACTIONS
} from './audit-actions'

describe('AUDIT_ACTION_LABELS', () => {
  test('has an entry for every AUDIT_ACTIONS member', () => {
    for (const action of AUDIT_ACTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeDefined()
    }
  })

  test('every label has a verb and a valid tone', () => {
    const validTones = ['brand', 'info', 'warning', 'danger', 'muted'] as const
    for (const action of AUDIT_ACTIONS) {
      const label = AUDIT_ACTION_LABELS[action]
      expect(typeof label.verb).toBe('string')
      expect(validTones).toContain(label.tone)
    }
  })
})

describe('SECRET_AUDIT_ACTIONS', () => {
  test('contains expected secret actions', () => {
    expect(SECRET_AUDIT_ACTIONS.has('pushed')).toBe(true)
    expect(SECRET_AUDIT_ACTIONS.has('revealed')).toBe(true)
    expect(SECRET_AUDIT_ACTIONS.has('secrets_updated')).toBe(true)
    expect(SECRET_AUDIT_ACTIONS.has('secrets_deleted')).toBe(true)
  })
})

describe('MEMBER_AUDIT_ACTIONS', () => {
  test('contains expected member actions', () => {
    expect(MEMBER_AUDIT_ACTIONS.has('member_invited')).toBe(true)
    expect(MEMBER_AUDIT_ACTIONS.has('member_removed')).toBe(true)
  })
})

describe('CLI_AUDIT_ACTIONS', () => {
  test('contains expected CLI actions', () => {
    expect(CLI_AUDIT_ACTIONS.has('pushed')).toBe(true)
    expect(CLI_AUDIT_ACTIONS.has('revealed')).toBe(true)
  })
})
