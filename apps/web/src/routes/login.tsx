import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

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
    <AuthShell headerHint="// auth">
      <AuthForm />
    </AuthShell>
  )
}
