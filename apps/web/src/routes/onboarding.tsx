'use client'

import { Alert, AlertDescription, AlertTitle } from '@envy/ui/components/alert'
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
import { ToggleGroup, ToggleGroupItem } from '@envy/ui/components/toggle-group'
import { cn } from '@envy/ui/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthShell } from '@/components/auth/auth-shell'
import { requireWebAuth } from '@/functions/require-web-auth'
import { authClient } from '@/lib/auth-client'
import {
  canContinueWorkspace,
  DEFAULT_ENVIRONMENTS,
  type OnboardingStep,
  type OrganizationType,
  toSlug
} from '@/utils/onboarding'
import { useTRPC } from '@/utils/trpc'

type CreatedProject = {
  id: string
  slug: string
  organizationId: string
  organizationSlug: string
}

const STEP_META = [
  { step: 1, label: 'WORKSPACE' },
  { step: 2, label: 'PROJECT' },
  { step: 3, label: 'CONNECT' },
  { step: 4, label: 'FINISH' }
] as const

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    await requireWebAuth('onboarding-forbidden')
  },
  head: () => ({
    meta: [
      { title: 'Get Started — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: OnboardingPage
})

function CommandLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-ghost-border bg-surface-2 px-4 py-3 font-mono text-[12px] text-text-primary">
      <span className="text-text-muted">$ </span>
      {children}
    </div>
  )
}

function OnboardingPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [organizationType, setOrganizationType] =
    useState<OrganizationType>('personal')
  const [organizationName, setOrganizationName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [workspaceError, setWorkspaceError] = useState('')
  const [projectError, setProjectError] = useState('')
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(
    null
  )
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const meQueryOptions = trpc.me.get.queryOptions()
  const meQuery = useQuery(meQueryOptions)
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const billingQuery = useQuery({
    ...trpc.billing.status.queryOptions({
      organizationId: createdProject?.organizationId ?? ''
    }),
    enabled: organizationType === 'team' && Boolean(createdProject)
  })

  const onboardingMutation = useMutation(
    trpc.me.completeOnboardingWithProject.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData(meQueryOptions.queryKey, (previous) =>
          previous
            ? {
                ...previous,
                onboardingCompletedAt: data.onboardingCompletedAt
              }
            : previous
        )
        await queryClient.invalidateQueries(
          trpc.projects.list.queryOptions({
            organizationId: data.project.organizationId
          })
        )
        setCreatedProject(data.project)
        const activeResult = await authClient.organization.setActive({
          organizationId: data.project.organizationId
        })
        if (activeResult.error) {
          toast.error(
            'Project created, but the workspace could not be activated yet.'
          )
        }
        setStep(3)
      },
      onError: (error) => setProjectError(error.message)
    })
  )

  const skipMutation = useMutation(
    trpc.me.skipOnboarding.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(meQueryOptions.queryKey, (previous) =>
          previous
            ? {
                ...previous,
                onboardingSkippedAt: data.onboardingSkippedAt,
                onboardingCompletedAt: data.onboardingCompletedAt
              }
            : previous
        )
        if (activeOrganization) {
          void navigate({
            to: '/org/$orgSlug',
            params: { orgSlug: activeOrganization.slug }
          })
        } else {
          void navigate({ to: '/auth/callback' })
        }
      }
    })
  )

  const inviteMutation = useMutation(
    trpc.members.invite.mutationOptions({
      onSuccess: async () => {
        setInviteEmail('')
        await billingQuery.refetch()
        toast.success('Invitation sent')
      },
      onError: (error) => toast.error(error.message)
    })
  )

  const isPending = onboardingMutation.isPending || skipMutation.isPending
  const projectSlug = toSlug(projectName)
  const organizationSlug = toSlug(organizationName)
  const workspaceLabel =
    meQuery.data?.name?.trim() || meQuery.data?.email?.split('@')[0] || 'you'
  const seatsAvailable = billingQuery.data
    ? Math.max(0, billingQuery.data.seatLimit - billingQuery.data.memberCount)
    : 0

  function continueWorkspace() {
    if (!canContinueWorkspace(organizationType, organizationName)) {
      setWorkspaceError('Team workspace name is required')
      return
    }
    setWorkspaceError('')
    setStep(2)
  }

  function createProject() {
    const name = projectName.trim()
    if (!name || !projectSlug) {
      setProjectError('Project name must contain at least one letter or number')
      return
    }
    if (name.length > 64) {
      setProjectError('Project name must be 64 characters or less')
      return
    }
    setProjectError('')
    onboardingMutation.mutate({
      name,
      organizationType,
      ...(organizationType === 'team'
        ? { organizationName: organizationName.trim() }
        : {})
    })
  }

  function finishLater() {
    if (!createdProject) return
    void navigate({
      to: '/org/$orgSlug',
      params: { orgSlug: createdProject.organizationSlug }
    })
  }

  function goToProject(destination: 'settings' | 'secrets') {
    if (!createdProject) return
    void navigate({
      to:
        destination === 'settings'
          ? '/org/$orgSlug/projects/$projectSlug'
          : '/org/$orgSlug/projects/$projectSlug/secrets',
      params: {
        orgSlug: createdProject.organizationSlug,
        projectSlug: createdProject.slug
      }
    })
  }

  async function copySetup() {
    try {
      await navigator.clipboard.writeText('npm install -g useenvy\nenvy')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy commands')
    }
  }

  return (
    <AuthShell
      headerAction={
        createdProject ? (
          <button
            type="button"
            onClick={finishLater}
            className="cursor-pointer font-mono text-[11px] text-text-muted transition-colors hover:text-text-primary"
          >
            finish later →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => skipMutation.mutate()}
            disabled={isPending}
            className="cursor-pointer font-mono text-[11px] text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
          >
            {skipMutation.isPending ? 'skipping…' : 'skip onboarding →'}
          </button>
        )
      }
    >
      <div className="w-full max-w-[580px]">
        <div className="mb-5 grid grid-cols-4 gap-2 font-mono text-[9px] tracking-[0.06em]">
          {STEP_META.map((item) => (
            <div key={item.step} className="flex min-w-0 flex-col gap-1.5">
              <span
                className={cn(
                  item.step === step
                    ? 'text-text-primary'
                    : item.step < step
                      ? 'text-brand'
                      : 'text-text-muted'
                )}
              >
                0{item.step} {item.label}
              </span>
              <span
                className={cn(
                  'h-px',
                  item.step <= step ? 'bg-brand' : 'bg-ghost-border'
                )}
              />
            </div>
          ))}
        </div>

        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Choose your workspace<span className="text-brand">.</span>
              </CardTitle>
              <CardDescription>
                Personal is private and ready immediately. Team creates a shared
                workspace; additional seats require the Team plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Workspace type</FieldLabel>
                  <ToggleGroup
                    value={[organizationType]}
                    onValueChange={(values) => {
                      const next = values[0]
                      if (next === 'personal' || next === 'team') {
                        setOrganizationType(next)
                        setWorkspaceError('')
                      }
                    }}
                    multiple={false}
                    variant="outline"
                    spacing={2}
                    className="grid w-full grid-cols-2"
                  >
                    <ToggleGroupItem value="personal">Personal</ToggleGroupItem>
                    <ToggleGroupItem value="team">Team</ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {organizationType === 'personal'
                      ? `Uses ${workspaceLabel}'s personal workspace.`
                      : 'Creates a separately named team workspace.'}
                  </FieldDescription>
                </Field>
                {organizationType === 'team' ? (
                  <Field data-invalid={workspaceError ? true : undefined}>
                    <FieldLabel htmlFor="workspace-name">
                      Team workspace name
                    </FieldLabel>
                    <Input
                      id="workspace-name"
                      value={organizationName}
                      onChange={(event) => {
                        setOrganizationName(event.target.value)
                        setWorkspaceError('')
                      }}
                      placeholder="Acme Platform"
                      maxLength={64}
                      aria-invalid={Boolean(workspaceError)}
                      autoFocus
                    />
                    <FieldDescription>
                      Workspace slug preview:{' '}
                      {organizationSlug || 'acme-platform'}
                    </FieldDescription>
                    {workspaceError ? (
                      <FieldError>{workspaceError}</FieldError>
                    ) : null}
                  </Field>
                ) : null}
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={continueWorkspace}>Continue →</Button>
            </CardFooter>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Create your first project<span className="text-brand">.</span>
              </CardTitle>
              <CardDescription>
                Review the permanent slug and the environments created with the
                project.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="rounded border border-ghost-border bg-surface-2 px-4 py-3 font-mono text-[11px] leading-6 text-text-primary">
                <div>
                  <span className="text-text-muted">workspace&nbsp; </span>
                  {organizationType === 'team'
                    ? organizationName
                    : `${workspaceLabel} · personal`}
                </div>
                <div>
                  <span className="text-text-muted">
                    envs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{' '}
                  </span>
                  {DEFAULT_ENVIRONMENTS.join(' · ')}
                </div>
              </div>
              <FieldGroup>
                <Field data-invalid={projectError ? true : undefined}>
                  <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(event) => {
                      setProjectName(event.target.value)
                      setProjectError('')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') createProject()
                    }}
                    placeholder="my-saas"
                    maxLength={64}
                    aria-invalid={Boolean(projectError)}
                    autoFocus
                  />
                  <FieldDescription>
                    Project slug preview: {projectSlug || 'my-saas'}
                  </FieldDescription>
                  {projectError ? (
                    <FieldError>{projectError}</FieldError>
                  ) : null}
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                onClick={createProject}
                disabled={!projectSlug || onboardingMutation.isPending}
              >
                {onboardingMutation.isPending
                  ? 'Creating…'
                  : 'Create workspace & project'}
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <CardHeader>
              <Badge variant="outline" className="mb-1">
                {createdProject?.slug} created
              </Badge>
              <CardTitle>
                Connect your terminal<span className="text-brand">.</span>
              </CardTitle>
              <CardDescription>
                Install the CLI, then run envy. The v2.1 TUI guides Login → Init
                → Push without memorizing commands.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Tabs defaultValue="npm">
                <TabsList>
                  <TabsTrigger value="npm">npm</TabsTrigger>
                  <TabsTrigger value="bun">bun</TabsTrigger>
                </TabsList>
                <TabsContent value="npm" className="flex flex-col gap-2 pt-2">
                  <CommandLine>npm install -g useenvy</CommandLine>
                  <CommandLine>envy</CommandLine>
                </TabsContent>
                <TabsContent value="bun" className="flex flex-col gap-2 pt-2">
                  <CommandLine>bun add -g useenvy</CommandLine>
                  <CommandLine>envy</CommandLine>
                </TabsContent>
              </Tabs>
              <div>
                <div className="mb-2 font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
                  Headless / automation
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <CommandLine>envy login</CommandLine>
                  <CommandLine>envy init</CommandLine>
                  <CommandLine>envy push</CommandLine>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={copySetup}>
                {copied ? 'Copied ✓' : 'Copy setup'}
              </Button>
              <Button onClick={() => setStep(4)}>Continue →</Button>
            </CardFooter>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                You&apos;re ready to ship<span className="text-brand">.</span>
              </CardTitle>
              <CardDescription>
                {organizationType === 'personal'
                  ? 'Open the project or add your first secret from the dashboard.'
                  : 'Finish the team setup with the next available action.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {organizationType === 'personal' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => goToProject('settings')}
                  >
                    Open project
                  </Button>
                  <Button onClick={() => goToProject('secrets')}>
                    Add first secret →
                  </Button>
                </div>
              ) : billingQuery.isPending ? (
                <div className="font-mono text-[11px] text-text-muted">
                  Checking available seats…
                </div>
              ) : seatsAvailable > 0 && createdProject ? (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="first-invite-email">
                      Invite your first teammate
                    </FieldLabel>
                    <Input
                      id="first-invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="teammate@company.com"
                    />
                    <FieldDescription>
                      {seatsAvailable} seat
                      {seatsAvailable === 1 ? '' : 's'} available.
                    </FieldDescription>
                    <Button
                      className="self-start"
                      disabled={
                        inviteMutation.isPending || !inviteEmail.includes('@')
                      }
                      onClick={() =>
                        inviteMutation.mutate({
                          organizationId: createdProject.organizationId,
                          email: inviteEmail.trim(),
                          role: 'member'
                        })
                      }
                    >
                      {inviteMutation.isPending
                        ? 'Sending…'
                        : 'Send invitation'}
                    </Button>
                  </Field>
                </FieldGroup>
              ) : (
                <Alert>
                  <AlertTitle>No additional seats available yet</AlertTitle>
                  <AlertDescription>
                    The workspace is ready, but inviting teammates requires the
                    Team plan. Open Billing to add capacity before sending an
                    invitation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={finishLater}>
                Finish later
              </Button>
              {organizationType === 'team' && seatsAvailable === 0 ? (
                <Button
                  onClick={() => {
                    if (!createdProject) return
                    void navigate({
                      to: '/org/$orgSlug/settings/billing',
                      params: { orgSlug: createdProject.organizationSlug }
                    })
                  }}
                >
                  Open Billing →
                </Button>
              ) : (
                <Button onClick={() => goToProject('secrets')}>
                  Open dashboard →
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </AuthShell>
  )
}
