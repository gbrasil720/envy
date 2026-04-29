import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/$projectSlug/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/dashboard/$projectSlug/secrets',
      params
    })
  }
})
