export const API_URL = process.env.ENVY_API_URL ?? 'https://api.useenvy.dev'
export const WEB_URL = process.env.ENVY_WEB_URL ?? 'https://useenvy.dev'

export const CONFIG_FILENAME = '.envy.json'

/** Overridable in tests via ENVY_POLL_INTERVAL_MS / ENVY_POLL_TIMEOUT_MS */
export const POLL_INTERVAL_MS =
  Number(process.env.ENVY_POLL_INTERVAL_MS) || 2000
export const POLL_TIMEOUT_MS =
  Number(process.env.ENVY_POLL_TIMEOUT_MS) || 5 * 60 * 1000
