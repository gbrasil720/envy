import { z } from 'zod'

const schema = z.object({
  VITE_SERVER_URL: z.url(),
  VITE_WAITLIST_MODE: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true')
})

const raw = {
  VITE_SERVER_URL:
    import.meta.env?.VITE_SERVER_URL ?? process.env.VITE_SERVER_URL,
  VITE_WAITLIST_MODE:
    import.meta.env?.VITE_WAITLIST_MODE ?? process.env.VITE_WAITLIST_MODE
}

const parsed = schema.safeParse(raw)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`
  )
}

export const env = parsed.data
