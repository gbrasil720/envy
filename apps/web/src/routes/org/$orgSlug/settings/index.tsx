import { Alert, AlertDescription, AlertTitle } from '@envy/ui/components/alert'
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
  CardAction,
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
import { Skeleton } from '@envy/ui/components/skeleton'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CopyValue } from '@/components/dashboard/copy-value'
import { useDashboardShell } from '@/components/dashboard/dashboard-context'
import { authClient } from '@/lib/auth-client'
import { formatDateShort } from '@/utils/time'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/org/$orgSlug/settings/')({
  component: OrganizationSettingsPage
})

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b border-ghost-divider py-3">
      <div className="font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
        {label}
      </div>
      <div className="mt-1 font-mono text-[12px] text-text-primary">
        {value}
      </div>
    </div>
  )
}

function OrganizationSettingsPage() {
  const { orgSlug } = Route.useParams()
  const navigate = useNavigate()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { organizationId } = useDashboardShell()
  const organizationQueryOptions = trpc.organization.get.queryOptions({
    organizationId
  })
  const organizationQuery = useQuery(organizationQueryOptions)
  const organization = organizationQuery.data
  const canEdit =
    organization?.role === 'owner' || organization?.role === 'admin'
  const canArchive =
    organization?.role === 'owner' && organization.type === 'team'
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)

  useEffect(() => {
    if (organization) setName(organization.name)
  }, [organization])

  const updateMutation = useMutation(
    trpc.organization.update.mutationOptions({
      onSuccess: async (updated) => {
        await queryClient.invalidateQueries(organizationQueryOptions)
        await authClient.organization.setActive({
          organizationId: updated.id
        })
        toast.success('Workspace renamed')
      },
      onError: (error) => setNameError(error.message)
    })
  )

  const archiveMutation = useMutation(
    trpc.organization.archive.mutationOptions({
      onSuccess: async ({ fallbackOrganization }) => {
        const activeResult = await authClient.organization.setActive({
          organizationId: fallbackOrganization.id
        })
        if (activeResult.error) {
          toast.error(activeResult.error.message)
          return
        }
        setArchiveOpen(false)
        await navigate({
          to: '/org/$orgSlug',
          params: { orgSlug: fallbackOrganization.slug },
          replace: true
        })
        toast.success('Workspace archived')
      },
      onError: (error) => toast.error(error.message)
    })
  )

  function saveName() {
    if (!organization) return
    const trimmedName = name.trim()
    if (!trimmedName || !/[a-z0-9]/i.test(trimmedName)) {
      setNameError('Enter a name with at least one letter or number')
      return
    }
    setNameError('')
    updateMutation.mutate({
      organizationId,
      name: trimmedName
    })
  }

  if (organizationQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-7 sm:px-7">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-7 text-text-secondary">
        {organizationQuery.error?.message ?? 'Workspace settings unavailable'}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-7 sm:px-7">
      <div>
        <div className="mb-2 font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase">
          {'// organization settings'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.015em] text-text-primary">
            {organization.name}
            <span className="text-brand">.</span>
          </h1>
          <Badge variant="outline">{organization.role}</Badge>
          <Badge variant="secondary">{organization.type}</Badge>
          {!canEdit ? <Badge variant="secondary">read-only</Badge> : null}
        </div>
      </div>

      {!canEdit ? (
        <Alert>
          <AlertTitle>Workspace settings are read-only</AlertTitle>
          <AlertDescription>
            Members can inspect workspace details and follow quick links.
            Renaming requires an admin or owner.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Workspace slug and type are permanent in this release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <FieldGroup>
                <Field data-invalid={nameError ? true : undefined}>
                  <FieldLabel htmlFor="organization-settings-name">
                    Workspace name
                  </FieldLabel>
                  <Input
                    id="organization-settings-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setNameError('')
                    }}
                    maxLength={64}
                    aria-invalid={Boolean(nameError)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveName()
                    }}
                  />
                  <FieldDescription>
                    Display name only. Slug remains {organization.slug}.
                  </FieldDescription>
                  {nameError ? <FieldError>{nameError}</FieldError> : null}
                  <Button
                    className="self-start"
                    onClick={saveName}
                    disabled={
                      updateMutation.isPending ||
                      !name.trim() ||
                      name.trim() === organization.name
                    }
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save name'}
                  </Button>
                </Field>
              </FieldGroup>
            ) : (
              <div className="font-mono text-[12px] text-text-primary">
                {organization.name}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace details</CardTitle>
            <CardDescription>
              Active access, plan, and organization-wide usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyValue label="Organization ID" value={organization.id} />
            <CopyValue label="Slug" value={organization.slug} />
            <div className="grid grid-cols-2 gap-x-4">
              <Stat label="Role" value={organization.role} />
              <Stat label="Plan" value={organization.plan} />
              <Stat label="Projects" value={organization.projectCount} />
              <Stat label="Members" value={organization.memberCount} />
              <Stat label="Secrets" value={organization.secretCount} />
              <Stat
                label="Created"
                value={formatDateShort(organization.createdAt)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace administration</CardTitle>
          <CardDescription>
            Jump directly to the organization-wide controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            render={
              <Link to="/org/$orgSlug/settings/members" params={{ orgSlug }} />
            }
          >
            Members
          </Button>
          <Button
            variant="outline"
            render={
              <Link to="/org/$orgSlug/settings/billing" params={{ orgSlug }} />
            }
          >
            Billing
          </Button>
          <Button
            variant="outline"
            render={
              <Link
                to="/org/$orgSlug/settings/audit-log"
                params={{ orgSlug }}
              />
            }
          >
            Audit log
          </Button>
        </CardContent>
      </Card>

      {organization.type === 'team' ? (
        <Card className="ring-destructive/30">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Archiving hides this team workspace and preserves its retained
              audit and billing history.
            </CardDescription>
            <CardAction>
              {canArchive ? (
                <Button
                  variant="destructive"
                  onClick={() => setArchiveOpen(true)}
                >
                  Archive workspace
                </Button>
              ) : (
                <Badge variant="outline">owner only</Badge>
              )}
            </CardAction>
          </CardHeader>
        </Card>
      ) : null}

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {organization.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The workspace will disappear from navigation. You will be moved to
              another active workspace; retained history is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                archiveMutation.mutate({
                  organizationId: organization.id
                })
              }
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? 'Archiving…' : 'Archive workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
