import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthForm } from '@/components/auth/auth-form'
import { MeshBackground } from '@/components/mesh-background'

const searchSchema = z.object({
  error: z.string().optional()
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
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
