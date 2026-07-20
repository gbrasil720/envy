import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidate all queries affected by a secrets mutation (push/update/delete).
 * Covers: secrets.reveal, secrets.listKeys, auditLog.list
 */
export function invalidateSecretScope(
  queryClient: QueryClient,
  projectId: string,
  environment?: string
) {
  if (environment) {
    queryClient.invalidateQueries({ queryKey: ['secrets:reveal', projectId, environment] })
    queryClient.invalidateQueries({ queryKey: ['secrets:listKeys', projectId, environment] })
  }
  queryClient.invalidateQueries({ queryKey: ['auditLog:list', projectId] })
}