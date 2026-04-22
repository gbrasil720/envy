import { createFileRoute } from '@tanstack/react-router'

import { AuthForm } from '@/components/auth/auth-form'
import { MeshBackground } from '@/components/mesh-background'

export const Route = createFileRoute('/login')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <MeshBackground>
      <AuthForm />
    </MeshBackground>
  )
}
