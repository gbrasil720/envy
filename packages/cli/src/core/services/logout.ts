import { api } from '../api'
import { clearAuth, requireAuth } from '../auth'

export type LogoutUI = {
  onStart?: () => void
  onDone?: () => void
}

export async function runLogout(ui: LogoutUI = {}): Promise<void> {
  requireAuth()
  ui.onStart?.()
  await api.auth.logout.mutate()
  clearAuth()
  ui.onDone?.()
}
