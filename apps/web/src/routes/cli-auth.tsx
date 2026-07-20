import { Button } from '@envy/ui/components/button'
import { ArrowLeft01Icon, LockIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthFormCli } from '@/components/auth/auth-form-cli'
import { EnvyWordmark } from '@/components/brand'
import { MeshBackground } from '@/components/mesh-background'
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
  const navigate = useNavigate()

  return (
    <MeshBackground>
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center">
        <EnvyWordmark markSize={20} className="text-[15px]" />
      </div>

      <Button
        onClick={() => navigate({ to: '/' })}
        variant="ghost"
        className="cursor-pointer absolute top-4 right-4 sm:top-8 sm:right-8 flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Back to Dashboard
      </Button>

      <AuthFormCli sessionToken={session} />

      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 text-text-muted text-[12px] font-medium">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={LockIcon} size={12} />
          <span>Session secured with AES-256</span>
          <span className="opacity-30">·</span>
          <span>useenvy.dev</span>
        </div>
      </div>
    </MeshBackground>
  )
}
