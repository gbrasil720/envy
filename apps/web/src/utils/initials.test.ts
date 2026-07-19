import { describe, expect, test } from 'bun:test'
import { initials } from './initials'

describe('initials', () => {
  test('uses first letters of first and last name', () => {
    expect(initials('Ada Lovelace', null)).toBe('AL')
    expect(initials('  Grace  Hopper  ', 'g@test.local')).toBe('GH')
  })

  test('uses first two characters of a single name', () => {
    expect(initials('Madonna', null)).toBe('MA')
    expect(initials('x', null)).toBe('X')
  })

  test('falls back to email when name is empty', () => {
    expect(initials(null, 'user@test.local')).toBe('US')
    expect(initials('', 'ab@test.local')).toBe('AB')
    expect(initials('   ', 'z@test.local')).toBe('Z@')
  })

  test('returns ?? when both name and email are missing', () => {
    expect(initials(null, null)).toBe('??')
    expect(initials(undefined, null)).toBe('??')
    expect(initials('', null)).toBe('??')
  })
})
