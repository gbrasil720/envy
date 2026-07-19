import { describe, expect, test } from 'bun:test'
import { effectiveRole, hasRole } from './roles'

describe('hasRole', () => {
  test('matches single role', () => {
    expect(hasRole('owner', 'owner')).toBe(true)
    expect(hasRole('admin', 'owner')).toBe(false)
    expect(hasRole('member', 'member')).toBe(true)
  })

  test('matches CSV roles from Better Auth', () => {
    expect(hasRole('admin,owner', 'owner')).toBe(true)
    expect(hasRole('admin,owner', 'admin')).toBe(true)
    expect(hasRole('admin,owner', 'member')).toBe(false)
  })

  test('trims whitespace around CSV entries', () => {
    expect(hasRole(' admin , owner ', 'owner')).toBe(true)
    expect(hasRole('admin,  member', 'member')).toBe(true)
  })

  test('empty role string does not match', () => {
    expect(hasRole('', 'owner')).toBe(false)
    expect(hasRole('  ', 'admin')).toBe(false)
  })
})

describe('effectiveRole', () => {
  test('prefers owner over admin', () => {
    expect(effectiveRole('owner')).toBe('owner')
    expect(effectiveRole('admin,owner')).toBe('owner')
    expect(effectiveRole('owner,admin')).toBe('owner')
  })

  test('prefers admin over member', () => {
    expect(effectiveRole('admin')).toBe('admin')
    expect(effectiveRole('member,admin')).toBe('admin')
  })

  test('defaults to member', () => {
    expect(effectiveRole('member')).toBe('member')
    expect(effectiveRole('')).toBe('member')
    expect(effectiveRole('viewer')).toBe('member')
  })
})
