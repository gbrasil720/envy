import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@envy/ui/components/alert-dialog'
import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import { Copy01Icon } from '@hugeicons/core-free-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { dashboardCardClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'
import { EnvironmentsManager } from './environments-manager'

type Props = {
  project: {
    id: string
    name: string
    slug: string
    plan: string
    role: string
    organizationId: string
    createdAt?: string | Date
  }
  secretsCount: number
  onUpgrade: () => void
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Could not copy')
  }
}

export function ProjectSettings({ project }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isOwner = project.role === 'owner'

  const archiveMutation = useMutation(
    trpc.organization.archive.mutationOptions({
      onSuccess: async () => {
        toast.success('Project archived')
        setDeleteOpen(false)
        await queryClient.invalidateQueries()
        void navigate({ to: '/dashboard' })
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to archive project')
      }
    })
  )

  return (
    <div className="flex flex-col gap-5">
      <Card className={dashboardCardClass}>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>
            Project identity (read-only from the dashboard for now).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Project name
              </p>
              <p className="font-mono text-sm">{project.name}</p>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => void copyText(project.name, 'Name')}
                  />
                }
              >
                <DashboardIcon
                  icon={Copy01Icon}
                  size="sm"
                  data-icon="inline-start"
                />
                Copy
              </TooltipTrigger>
              <TooltipContent>Copy name</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Slug</p>
              <p className="font-mono text-sm">{project.slug}</p>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => void copyText(project.slug, 'Slug')}
                  />
                }
              >
                <DashboardIcon
                  icon={Copy01Icon}
                  size="sm"
                  data-icon="inline-start"
                />
                Copy
              </TooltipTrigger>
              <TooltipContent>Copy slug</TooltipContent>
            </Tooltip>
          </div>
          {project.createdAt ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Created
              </p>
              <p className="text-sm">
                {new Date(project.createdAt).toLocaleString()}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <EnvironmentsManager
        projectId={project.id}
        projectSlug={project.slug}
        role={project.role}
      />

      <Card className="rounded-xl border-destructive/30 bg-destructive/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger zone
          </CardTitle>
          <CardDescription>
            Archive this project&apos;s organization. Secrets are retained for
            compliance and no longer appear in your dashboard.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t border-destructive/20 pt-4">
          {isOwner ? (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              Archive project
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive opacity-60"
                    disabled
                  />
                }
              >
                Archive project
              </TooltipTrigger>
              <TooltipContent>
                Only the organization owner can archive
              </TooltipContent>
            </Tooltip>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project</AlertDialogTitle>
            <AlertDialogDescription>
              Archive <strong>{project.name}</strong>? It will disappear from
              your dashboard. Data is soft-deleted (not permanently erased) for
              billing/compliance retention.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                archiveMutation.mutate({
                  organizationId: project.organizationId
                })
              }}
            >
              {archiveMutation.isPending ? 'Archiving…' : 'Archive project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
