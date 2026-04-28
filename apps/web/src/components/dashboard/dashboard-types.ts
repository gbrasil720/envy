export type DashboardSection = 'secrets' | 'members' | 'audit' | 'settings'

export type DashboardProject = {
  id: string
  name: string
  slug: string
  plan: string
  environments?: { name: string }[]
  secretsCount?: number
  lastSyncedAt?: string | null
}
