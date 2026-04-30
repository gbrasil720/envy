export const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string) ??
  (process.env.VITE_SERVER_URL as string)

export const WAITLIST_MODE =
  (import.meta.env.VITE_WAITLIST_MODE ?? process.env.VITE_WAITLIST_MODE) ===
  'true'
