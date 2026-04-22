import { createFileRoute } from '@tanstack/react-router'
import { AuthorizationExpiredCard } from '@/components/cli/authorization-expired-card'
import { AuthorizeProjectCard } from '@/components/cli/authorize-project-card'
import { ProjectAuthorizedCard } from '@/components/cli/project-authorized-card'
import { MeshBackground } from '@/components/mesh-background'

export const Route = createFileRoute('/sandbox')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <MeshBackground className="flex flex-col sm:flex-row flex-wrap gap-10 items-center justify-center px-4 py-8">
      <AuthorizeProjectCard
        sessionToken="sandbox-demo"
        expiresAt={new Date(Date.now() + 300_000).toISOString()}
        onAuthorize={() => {}}
        onCancel={() => {}}
        isAuthorizing={false}
        isCancelling={false}
      />
      <ProjectAuthorizedCard />
      <AuthorizationExpiredCard />
    </MeshBackground>
  )
}
