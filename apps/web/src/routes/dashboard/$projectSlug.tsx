import { Button } from '@envy/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@envy/ui/components/empty'
import { Skeleton } from '@envy/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/dashboard/$projectSlug')({
  head: ({ params }) => ({
    meta: [
      { title: `${params.projectSlug} — Envy Dashboard` },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: ProjectLayout
})

function ProjectLayout() {
  const { projectSlug } = Route.useParams()
  const trpc = useTRPC()

  const projectDetailQuery = useQuery(
    trpc.projects.get.queryOptions({ slug: projectSlug })
  )

  if (projectDetailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (projectDetailQuery.isError) {
    return (
      <Empty className="min-h-[40vh] border border-dashed border-destructive/30 bg-destructive/5">
        <EmptyHeader>
          <EmptyTitle>Could not load project</EmptyTitle>
          <EmptyDescription>
            {projectDetailQuery.error?.message ??
              'Check your connection and try again.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            size="sm"
            variant="outline"
            onClick={() => projectDetailQuery.refetch()}
          >
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (!projectDetailQuery.data) return null

  return <Outlet />
}
