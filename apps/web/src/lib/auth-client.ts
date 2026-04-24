import { sentinelClient } from '@better-auth/infra/client'
import { env } from '@envy/env/web'
import { createAuthClient } from 'better-auth/react'
import { SERVER_URL } from './env'

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  plugins: [sentinelClient()]
})
