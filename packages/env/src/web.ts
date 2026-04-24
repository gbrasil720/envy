import { z } from 'zod'

const schema = z.object({
  VITE_SERVER_URL: z.url()
})

const raw = {
  VITE_SERVER_URL:
    import.meta.env?.VITE_SERVER_URL ?? process.env.VITE_SERVER_URL
}

const parsed = schema.safeParse(raw)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`
  )
}

export const env = parsed.data
