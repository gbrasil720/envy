export const API_URL = process.env.ENVY_API_URL ?? 'http://localhost:3000'
export const WEB_URL = process.env.ENVY_WEB_URL ?? 'https://useenvy.dev'

export const CONFIG_FILENAME = '.envy.json'

export const POLL_INTERVAL_MS = 2000
export const POLL_TIMEOUT_MS = 5 * 60 * 1000
