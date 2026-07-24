import { describe, expect, test } from 'bun:test'
import { canContinueWorkspace, nextOnboardingStep, toSlug } from './onboarding'

describe('onboarding helpers', () => {
  test('generates URL-safe slugs', () => {
    expect(toSlug('  My Team & API  ')).toBe('my-team-api')
    expect(toSlug('!!!')).toBe('')
  })

  test('requires a valid team workspace name', () => {
    expect(canContinueWorkspace('personal', '')).toBe(true)
    expect(canContinueWorkspace('team', '!!!')).toBe(false)
    expect(canContinueWorkspace('team', 'Platform')).toBe(true)
  })

  test('advances without moving past finish', () => {
    expect(nextOnboardingStep(2)).toBe(3)
    expect(nextOnboardingStep(4)).toBe(4)
  })
})
