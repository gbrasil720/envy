import { describe, expect, test } from 'bun:test'
import { PLAN_LIMITS, type Plan } from './plan-limits'

describe('PLAN_LIMITS', () => {
  test('free plan quotas', () => {
    expect(PLAN_LIMITS.free).toEqual({
      projects: 1,
      secrets: 50,
      members: 1
    })
  })

  test('pro is unlimited projects/secrets with 1 member', () => {
    expect(PLAN_LIMITS.pro.projects).toBe(Number.POSITIVE_INFINITY)
    expect(PLAN_LIMITS.pro.secrets).toBe(Number.POSITIVE_INFINITY)
    expect(PLAN_LIMITS.pro.members).toBe(1)
  })

  test('team allows 5 members and unlimited projects/secrets', () => {
    expect(PLAN_LIMITS.team.projects).toBe(Number.POSITIVE_INFINITY)
    expect(PLAN_LIMITS.team.secrets).toBe(Number.POSITIVE_INFINITY)
    expect(PLAN_LIMITS.team.members).toBe(5)
  })

  test('covers all Plan keys', () => {
    const plans: Plan[] = ['free', 'pro', 'team']
    for (const plan of plans) {
      expect(PLAN_LIMITS[plan]).toBeDefined()
      expect(typeof PLAN_LIMITS[plan].projects).toBe('number')
      expect(typeof PLAN_LIMITS[plan].secrets).toBe('number')
      expect(typeof PLAN_LIMITS[plan].members).toBe('number')
    }
  })
})
