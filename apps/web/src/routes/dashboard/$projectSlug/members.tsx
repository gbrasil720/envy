import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MembersList } from '@/components/dashboard/members-list'
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
  const { projectSlug } = Route.useParams()
  const trpc = useTRPC()

  const meQuery = useQuery(trpc.me.get.queryOptions())
  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const projectDetailQuery = useQuery(
    trpc.projects.get.queryOptions({ slug: projectSlug })
  )

  const currentProject =
    projectsQuery.data?.find((p) => p.slug === projectSlug) ?? null
  const detail = projectDetailQuery.data

  if (!detail || !currentProject) return null

  return (
    <MembersList
      projectId={detail.id}
      currentUserId={meQuery.data?.id ?? ''}
      currentUserRole={detail.role}
      orgPlan={currentProject.plan}
    />
  )
}
