export type DashboardSection =
  | 'secrets'
  | 'projectSettings'
  | 'organization'
  | 'members'
  | 'billing'
  | 'audit'

export type DashboardProject = {
  id: string
  name: string
  slug: string
  organizationId: string
  plan: string
  environments?: { name: string }[]
  secretsCount?: number
  lastSyncedAt?: string | null
}
