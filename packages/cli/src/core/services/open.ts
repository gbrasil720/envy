import { spawn } from 'node:child_process'
import { requireAuth } from '../auth'
import { getConfig } from '../config'
import { WEB_URL } from '../constants'

export type OpenResult = {
  url: string
  projectLabel: string | null
  linked: boolean
}

export function runOpen(): OpenResult {
  requireAuth()

  const config = getConfig()
  let url: string
  let projectLabel: string | null = null
  let linked = false

  if (config?.project_slug) {
    url = `${WEB_URL}/dashboard/${encodeURIComponent(config.project_slug)}`
    projectLabel = config.project_slug
    linked = true
  } else {
    url = `${WEB_URL}/dashboard`
  }

  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], {
        detached: true,
        stdio: 'ignore'
      })
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' })
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
    }
  } catch {
    // caller surfaces warning
  }

  return { url, projectLabel, linked }
}
