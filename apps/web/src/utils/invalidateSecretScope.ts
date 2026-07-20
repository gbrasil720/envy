import type { QueryClient } from '@tanstack/react-query'
import type { AppRouter } from '@envy/api/routers/index'
import type { TRPCClient } from '@trpc/tanstack-react-query'

/**
 * Invalidate all queries affected by a secrets mutation (push/update/delete).
 * Covers: secrets.reveal, secrets.listKeys, auditLog.list
 */
export function invalidateSecretScope(
  queryClient: QueryClient,
  trpc: TRPCClient<AppRouter>,
  projectId: string,
  environment?: string
) {
  if (environment) {
    queryClient.invalidateQueries(
      trpc.secrets.reveal.queryOptions({ projectId, environment })
    )
    queryClient.invalidateQueries(
      trpc.secrets.listKeys.queryOptions({ projectId, environment })
    )
  }
  queryClient.invalidateQueries({ queryKey: ['auditLog:list', projectId] })
}