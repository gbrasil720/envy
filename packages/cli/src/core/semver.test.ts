import { describe, expect, test } from 'bun:test'
import { compareSemver, isNewerVersion } from './semver'

describe('compareSemver', () => {
  test('orders major/minor/patch', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
    expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0)
    expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0)
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
  })

  test('strips leading v', () => {
    expect(compareSemver('v1.2.3', '1.2.3')).toBe(0)
    expect(compareSemver('v2.0.0', 'v1.9.9')).toBeGreaterThan(0)
  })

  test('pads missing segments as zero', () => {
    expect(compareSemver('1.2', '1.2.0')).toBe(0)
    expect(compareSemver('1', '1.0.0')).toBe(0)
    expect(compareSemver('1.2.1', '1.2')).toBeGreaterThan(0)
  })
})

describe('isNewerVersion', () => {
  test('returns true only when latest is greater', () => {
    expect(isNewerVersion('2.0.0', '1.9.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(false)
  })
})
