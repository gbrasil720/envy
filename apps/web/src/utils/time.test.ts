import { describe, expect, it } from 'bun:test'
import { formatDateShort, timeAgoCompact, timeAgoVerbose } from './time'

describe('timeAgoCompact', () => {
  it('returns "now" for very recent dates', () => {
    expect(timeAgoCompact(new Date())).toBe('now')
  })

  it('returns minutes for < 1 hour', () => {
    const d = new Date(Date.now() - 30 * 60000)
    expect(timeAgoCompact(d)).toBe('30m')
  })

  it('returns hours for < 24 hours', () => {
    const d = new Date(Date.now() - 5 * 3600000)
    expect(timeAgoCompact(d)).toBe('5h')
  })

  it('returns days for < 30 days', () => {
    const d = new Date(Date.now() - 10 * 86400000)
    expect(timeAgoCompact(d)).toBe('10d')
  })

  it('returns short date for > 30 days', () => {
    const d = new Date(Date.now() - 60 * 86400000)
    const result = timeAgoCompact(d)
    expect(result).not.toBe('now')
    expect(result).not.toMatch(/[md]$/)
  })

  it('accepts ISO string', () => {
    const d = new Date(Date.now() - 45 * 60000)
    expect(timeAgoCompact(d.toISOString())).toBe('45m')
  })
})

describe('timeAgoVerbose', () => {
  it('returns "—" for undefined', () => {
    expect(timeAgoVerbose(undefined)).toBe('—')
  })

  it('returns "Just now" for very recent dates', () => {
    expect(timeAgoVerbose(new Date())).toBe('Just now')
  })

  it('returns minutes for < 1 hour', () => {
    const d = new Date(Date.now() - 20 * 60000)
    expect(timeAgoVerbose(d)).toBe('20m ago')
  })

  it('returns hours for < 24 hours', () => {
    const d = new Date(Date.now() - 3 * 3600000)
    expect(timeAgoVerbose(d)).toBe('3h ago')
  })

  it('returns days for < 7 days', () => {
    const d = new Date(Date.now() - 4 * 86400000)
    expect(timeAgoVerbose(d)).toBe('4d ago')
  })

  it('returns full date for > 7 days', () => {
    const d = new Date(Date.now() - 10 * 86400000)
    const result = timeAgoVerbose(d)
    expect(result).not.toMatch(/ago$/)
  })
})

describe('formatDateShort', () => {
  it('returns "—" for null', () => {
    expect(formatDateShort(null)).toBe('—')
  })

  it('returns "—" for undefined', () => {
    expect(formatDateShort(undefined)).toBe('—')
  })

  it('formats a date as short date', () => {
    const d = new Date(2024, 5, 15)
    expect(formatDateShort(d)).toBe('Jun 15, 2024')
  })

  it('accepts ISO string', () => {
    expect(formatDateShort('2024-06-15T00:00:00Z')).toBe('Jun 15, 2024')
  })
})
