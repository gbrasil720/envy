import { createFileRoute } from '@tanstack/react-router'
import { AuthFormCli } from '@/components/auth/auth-form-cli'
import { AuthShell } from '@/components/auth/auth-shell'
import { getAuthState } from '@/functions/get-auth-state'

export const Route = createFileRoute('/cli-auth')({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search.session === 'string' ? search.session : undefined
  }),
  beforeLoad: async () => {
    const auth = await getAuthState()
    return { auth }
  },
  head: () => ({
    meta: [
      { title: 'CLI Authorization — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: RouteComponent
})

function RouteComponent() {
  const { session } = Route.useSearch()

  return (
    <AuthShell headerHint="// cli handshake">
      <AuthFormCli sessionToken={session} />
    </AuthShell>
  )
}
