import { sentinelClient } from '@better-auth/infra/client'
import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { SERVER_URL } from './env'

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  plugins: [
    sentinelClient(),
    organizationClient({
      schema: {
        organization: {
          additionalFields: {
            type: {
              type: 'string',
              required: true,
              input: false
            }
          }
        }
      }
    })
  ]
})
