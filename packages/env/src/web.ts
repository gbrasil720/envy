import { z } from 'zod'

const schema = z.object({
  VITE_SERVER_URL: z.url()
})

const parsed = schema.safeParse({
  VITE_SERVER_URL: process.env.VITE_SERVER_URL
})

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`
  )
}

export const env = parsed.data
