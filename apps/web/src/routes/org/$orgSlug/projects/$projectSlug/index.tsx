import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$orgSlug/projects/$projectSlug/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/org/$orgSlug/projects/$projectSlug/secrets',
      params
    })
  }
})
