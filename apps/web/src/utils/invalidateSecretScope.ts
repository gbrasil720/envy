import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Invalidate all queries affected by a secrets mutation (push/update/delete).
 * Covers: secrets.reveal, secrets.listKeys, auditLog.list
 */
export function invalidateSecretScope(
  queryClient: QueryClient,
  trpc: {
    secrets: {
      reveal: {
        queryOptions: (input: { projectId: string; environment: string }) => {
          queryKey: QueryKey
        }
      }
      listKeys: {
        queryOptions: (input: { projectId: string; environment: string }) => {
          queryKey: QueryKey
        }
      }
    }
  },
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
