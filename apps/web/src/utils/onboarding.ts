export type OnboardingStep = 1 | 2 | 3 | 4
export type OrganizationType = 'personal' | 'team'

export const DEFAULT_ENVIRONMENTS = [
  'development',
  'staging',
  'production'
] as const

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function canContinueWorkspace(
  organizationType: OrganizationType,
  organizationName: string
): boolean {
  return organizationType === 'personal' || Boolean(toSlug(organizationName))
}

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep {
  return Math.min(4, step + 1) as OnboardingStep
}
