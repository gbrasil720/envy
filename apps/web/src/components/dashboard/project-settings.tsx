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
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import { Progress } from '@envy/ui/components/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import { Copy01Icon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import {
  dashboardCardClass,
  dashboardPlanBadgeClass
} from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'

type Props = {
  project: {
    id: string
    name: string
    slug: string
    plan: string
    createdAt?: string | Date
  }
  environments: { id: string; name: string; createdAt?: string | Date }[]
  onUpgrade: () => void
}

const planLabels: Record<string, string> = {
  free: 'Free — 1 project, 50 secrets',
  pro: 'Pro — unlimited projects and secrets',
  team: 'Team — up to 5 members per project'
}

const PLAN_LIMITS = {
  secrets: { free: 50, pro: Infinity, team: Infinity },
  projects: { free: 1, pro: Infinity, team: Infinity }
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Could not copy')
  }
}

export function ProjectSettings({ project, environments, onUpgrade }: Props) {
  const trpc = useTRPC()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const projectsListQuery = useQuery(trpc.projects.list.queryOptions())
  const projectCount = projectsListQuery.data?.length ?? 0

  const sampleEnv = environments[0]?.name ?? 'development'
  const secretsQuery = useQuery(
    trpc.secrets.reveal.queryOptions({
      projectId: project.id,
      environment: sampleEnv
    })
  )
  const secretCount = Object.keys(secretsQuery.data?.secrets ?? {}).length

  const plan = project.plan as keyof typeof PLAN_LIMITS.secrets
  const secretLimit = PLAN_LIMITS.secrets[plan] ?? PLAN_LIMITS.secrets.free
  const projectLimit = PLAN_LIMITS.projects[plan] ?? PLAN_LIMITS.projects.free

  const secretPct =
    Number.isFinite(secretLimit) && secretLimit > 0
      ? Math.min(100, Math.round((secretCount / secretLimit) * 100))
      : 0
  const projectPct =
    Number.isFinite(projectLimit) && projectLimit > 0
      ? Math.min(100, Math.round((projectCount / projectLimit) * 100))
      : 0

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

      {/* <Card className={dashboardCardClass}>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
          <CardDescription>
            Approximate usage against your plan (secrets counted in{' '}
            <span className="font-mono">{sampleEnv}</span>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Secrets ({sampleEnv})
              </span>
              <span className="tabular-nums font-mono text-muted-foreground">
                {Number.isFinite(secretLimit)
                  ? `${secretCount} / ${secretLimit}`
                  : `${secretCount}`}
              </span>
            </div>
            {Number.isFinite(secretLimit) ? (
              <Progress value={secretPct} className="h-2" />
            ) : (
              <p className="text-xs text-muted-foreground">Unlimited secrets</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Projects</span>
              <span className="tabular-nums font-mono text-muted-foreground">
                {Number.isFinite(projectLimit)
                  ? `${projectCount} / ${projectLimit}`
                  : `${projectCount}`}
              </span>
            </div>
            {Number.isFinite(projectLimit) ? (
              <Progress value={projectPct} className="h-2" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Unlimited projects
              </p>
            )}
          </div>
        </CardContent>
      </Card> */}

      {/* <Card className={dashboardCardClass}>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Plan</CardTitle>
            <CardDescription>
              {planLabels[project.plan] ?? project.plan}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={dashboardPlanBadgeClass(project.plan)}>
              {project.plan}
            </Badge>
            {project.plan === 'free' ? (
              <Button size="sm" onClick={onUpgrade}>
                Upgrade
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>Encrypted secrets at rest (AES-256-GCM)</li>
            <li>CLI and dashboard audit trail</li>
            <li>Environment-scoped secret stores</li>
          </ul>
        </CardContent>
      </Card> */}

      <Card className={dashboardCardClass}>
        <CardHeader>
          <CardTitle className="text-base">Environments</CardTitle>
          <CardDescription>
            Environments are created automatically the first time you push to a
            new name (e.g. <span className="font-mono">development</span>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 divide-y divide-border">
          {environments.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              No environments yet — run{' '}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                envy push
              </code>{' '}
              to create one.
            </p>
          ) : (
            environments.map((env) => (
              <div
                key={env.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
              >
                <span className="font-mono text-sm font-medium">
                  {env.name}
                </span>
                {env.createdAt ? (
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(env.createdAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30 bg-destructive/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently deletes all secrets and environments. Cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t border-destructive/20 pt-4">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                />
              }
            >
              Delete project
            </TooltipTrigger>
            <TooltipContent>
              Opens confirmation — server delete not wired yet
            </TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting <strong>{project.name}</strong> is not available from the
              dashboard yet. This confirmation is a preview only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled
              title="Not available yet"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
