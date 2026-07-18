import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MembersList } from '@/components/dashboard/members-list'
import { useCurrentProject } from '@/components/dashboard/project-context'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/dashboard/$projectSlug/members')({
  head: ({ params }) => ({
    meta: [
      { title: `${params.projectSlug} / Members — Envy` },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: MembersPage
})

function MembersPage() {
  const detail = useCurrentProject()
  const trpc = useTRPC()
  const meQuery = useQuery(trpc.me.get.queryOptions())

  return (
    <MembersList
      projectId={detail.id}
      currentUserId={meQuery.data?.id ?? ''}
      currentUserRole={detail.role}
      orgPlan={detail.plan}
    />
  )
}
