/** Pure plan display constants — safe to import from web. */

export type Plan = 'free' | 'pro' | 'team'

export const PLAN_LIMITS = {
  free: { projects: 1, secrets: 50, members: 1 },
  pro: {
    projects: Number.POSITIVE_INFINITY,
    secrets: Number.POSITIVE_INFINITY,
    members: 1
  },
  team: {
    projects: Number.POSITIVE_INFINITY,
    secrets: Number.POSITIVE_INFINITY,
    members: 5
  }
} as const satisfies Record<
  Plan,
  { projects: number; secrets: number; members: number }
>
