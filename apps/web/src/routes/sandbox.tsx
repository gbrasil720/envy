import { createFileRoute } from '@tanstack/react-router'
import { AuthorizationExpiredCard } from '@/components/cli/authorization-expired-card'
import { AuthorizeProjectCard } from '@/components/cli/authorize-project-card'
import { ProjectAuthorizedCard } from '@/components/cli/project-authorized-card'

export const Route = createFileRoute('/sandbox')({
  head: () => ({
    meta: [
      { title: 'Sandbox — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div className="flex row gap-4">
      <AuthorizationExpiredCard />
      <AuthorizeProjectCard
        sessionToken="123"
        expiresAt="2026-04-25T:20:00:00.000Z"
        onAuthorize={() => {}}
        onCancel={() => {}}
        isAuthorizing={false}
        isCancelling={false}
      />
      <ProjectAuthorizedCard />
    </div>
  )
}
