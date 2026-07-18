import pkg from '../../../package.json'
import { api } from '../api'
import { requireAuth } from '../auth'

export type WhoamiResult = {
  name: string
  email: string
  version: string
}

export async function runWhoami(): Promise<WhoamiResult> {
  requireAuth()
  const user = await api.me.get.query()
  return {
    name: user.name ?? '—',
    email: user.email,
    version: `v${pkg.version}`
  }
}
