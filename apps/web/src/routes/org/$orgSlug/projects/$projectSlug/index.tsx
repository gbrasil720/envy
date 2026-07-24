import { Alert, AlertDescription, AlertTitle } from '@envy/ui/components/alert'
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@envy/ui/components/field'
import { Input } from '@envy/ui/components/input'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@envy/ui/components/tabs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { CopyValue } from '@/components/dashboard/copy-value'
import { EnvironmentsManager } from '@/components/dashboard/environments-manager'
import { useCurrentProject } from '@/components/dashboard/project-context'
import { formatDateShort, timeAgoVerbose } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/org/$orgSlug/projects/$projectSlug/')({
  component: ProjectSettingsPage
})

function CodeLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-ghost-border bg-surface-2 px-4 py-3 font-mono text-[12px] text-text-primary">
      <span className="text-text-muted">$ </span>
      {children}
    </div>
  )
}

function ProjectSettingsPage() {
  const { orgSlug, projectSlug } = Route.useParams()
  const project = useCurrentProject()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const canEdit = project.role === 'owner' || project.role === 'admin'
  const [name, setName] = useState(project.name)
  const [nameError, setNameError] = useState('')

  const updateMutation = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.projects.get.queryOptions({
              organizationSlug: orgSlug,
              projectSlug
            })
          ),
          queryClient.invalidateQueries(
            trpc.projects.list.queryOptions({
              organizationId: project.organizationId
            })
          )
        ])
        toast.success('Project renamed')
      },
      onError: (error) => setNameError(error.message)
    })
  )

  function saveName() {
    const trimmedName = name.trim()
    if (!trimmedName || !/[a-z0-9]/i.test(trimmedName)) {
      setNameError('Enter a name with at least one letter or number')
      return
    }
    setNameError('')
    updateMutation.mutate({ projectId: project.id, name: trimmedName })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-7 sm:px-7">
      <div>
        <div className="mb-2 font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
          {'// project settings'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.015em] text-text-primary">
            {project.name}
            <span className="text-brand">.</span>
          </h1>
          <Badge variant="outline">{project.role}</Badge>
          {!canEdit ? <Badge variant="secondary">read-only</Badge> : null}
        </div>
      </div>

      {!canEdit ? (
        <Alert>
          <AlertTitle>Project settings are read-only</AlertTitle>
          <AlertDescription>
            Members can inspect project details and environments. An admin or
            owner is required to rename the project or manage environments.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              The project slug is permanent so CLI configuration stays stable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <FieldGroup>
                <Field data-invalid={nameError ? true : undefined}>
                  <FieldLabel htmlFor="project-settings-name">
                    Project name
                  </FieldLabel>
                  <Input
                    id="project-settings-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setNameError('')
                    }}
                    aria-invalid={Boolean(nameError)}
                    maxLength={64}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveName()
                    }}
                  />
                  <FieldDescription>
                    Display name only. Slug remains {project.slug}.
                  </FieldDescription>
                  {nameError ? <FieldError>{nameError}</FieldError> : null}
                  <Button
                    className="self-start"
                    onClick={saveName}
                    disabled={
                      updateMutation.isPending ||
                      name.trim() === project.name ||
                      !name.trim()
                    }
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save name'}
                  </Button>
                </Field>
              </FieldGroup>
            ) : (
              <div className="font-mono text-[12px] text-text-primary">
                {project.name}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>
              Stable identifiers and current usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyValue label="Project ID" value={project.id} />
            <CopyValue label="Slug" value={project.slug} />
            <div className="grid grid-cols-2 gap-x-4">
              <CopyValue label="Role" value={project.role} />
              <CopyValue
                label="Created"
                value={formatDateShort(project.createdAt)}
              />
              <CopyValue label="Secrets" value={String(project.secretsCount)} />
              <CopyValue
                label="Environments"
                value={String(project.environments.length)}
              />
            </div>
            <div className="pt-3 font-mono text-[10.5px] text-text-muted">
              Last activity: {timeAgoVerbose(project.lastActivityAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environments</CardTitle>
          <CardDescription>
            Isolate secrets by deployment stage without changing projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnvironmentsManager
            projectId={project.id}
            projectSlug={project.slug}
            organizationSlug={orgSlug}
            role={project.role}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect from your terminal</CardTitle>
          <CardDescription>
            The interactive TUI is the fastest path. It guides Login → Init →
            Push and keeps the project context visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Tabs defaultValue="npm">
            <TabsList>
              <TabsTrigger value="npm">npm</TabsTrigger>
              <TabsTrigger value="bun">bun</TabsTrigger>
            </TabsList>
            <TabsContent value="npm" className="flex flex-col gap-2 pt-2">
              <CodeLine>npm install -g useenvy</CodeLine>
              <CodeLine>envy</CodeLine>
            </TabsContent>
            <TabsContent value="bun" className="flex flex-col gap-2 pt-2">
              <CodeLine>bun add -g useenvy</CodeLine>
              <CodeLine>envy</CodeLine>
            </TabsContent>
          </Tabs>

          <div>
            <h2 className="mb-1 text-[13px] font-semibold text-text-primary">
              Headless and automation
            </h2>
            <p className="mb-3 text-[12px] text-text-secondary">
              Use explicit commands in CI or when you already know the next
              action.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <CodeLine>envy login</CodeLine>
              <CodeLine>envy init</CodeLine>
              <CodeLine>envy push</CodeLine>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
