import { createFileRoute } from '@tanstack/react-router'

import { AuthForm } from '@/components/auth/auth-form'
import { MeshBackground } from '@/components/mesh-background'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Log In — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: RouteComponent
})

function RouteComponent() {
  return (
    <MeshBackground>
      <AuthForm />
    </MeshBackground>
  )
}
