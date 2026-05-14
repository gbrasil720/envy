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
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@envy/ui/components/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@envy/ui/components/field'
import { Input } from '@envy/ui/components/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import {
  Add01Icon,
  Delete01Icon,
  Edit01Icon,
  Key01Icon,
  Layers01Icon
} from '@hugeicons/core-free-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { dashboardCardClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'

type Env = {
  id: string
  name: string
  secretsCount: number
  createdAt?: string | Date | null
}

type Props = {
  projectId: string
  projectSlug: string
  role: string
}

const ENV_NAME_RE = /^[a-z0-9_-]+$/

function validateEnvName(name: string): string | null {
  if (!name.trim()) return 'Name is required'
  if (name.length > 64) return 'Max 64 characters'
  if (!ENV_NAME_RE.test(name))
    return 'Only lowercase letters, numbers, hyphens and underscores'
  return null
}

export function EnvironmentsManager({ projectId, projectSlug, role }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const canEdit = role === 'owner' || role === 'admin'

  const envsQuery = useQuery(trpc.environments.list.queryOptions({ projectId }))
  const envs: Env[] = envsQuery.data ?? []

  const invalidate = () =>
    queryClient.invalidateQueries(
      trpc.environments.list.queryOptions({ projectId })
    )

  // --- create ---
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const createMutation = useMutation(
    trpc.environments.create.mutationOptions({
      onSuccess: () => {
        invalidate()
        setCreateOpen(false)
        setCreateName('')
        setCreateError(null)
        toast.success('Environment created')
      },
      onError: (err) => setCreateError(err.message)
    })
  )

  function handleCreate() {
    const err = validateEnvName(createName)
    if (err) {
      setCreateError(err)
      return
    }
    createMutation.mutate({ projectId, name: createName.trim() })
  }

  // --- rename ---
  const [renameTarget, setRenameTarget] = useState<Env | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const renameMutation = useMutation(
    trpc.environments.rename.mutationOptions({
      onSuccess: () => {
        invalidate()
        setRenameTarget(null)
        setRenameName('')
        setRenameError(null)
        toast.success('Environment renamed')
      },
      onError: (err) => setRenameError(err.message)
    })
  )

  function openRename(env: Env) {
    setRenameTarget(env)
    setRenameName(env.name)
    setRenameError(null)
  }

  function handleRename() {
    if (!renameTarget) return
    const err = validateEnvName(renameName)
    if (err) {
      setRenameError(err)
      return
    }
    if (renameName.trim() === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    renameMutation.mutate({
      projectId,
      environmentId: renameTarget.id,
      name: renameName.trim()
    })
  }

  // --- delete ---
  const [deleteTarget, setDeleteTarget] = useState<Env | null>(null)

  const deleteMutation = useMutation(
    trpc.environments.delete.mutationOptions({
      onSuccess: () => {
        invalidate()
        setDeleteTarget(null)
        toast.success('Environment deleted')
      },
      onError: (err) => toast.error(err.message)
    })
  )

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate({ projectId, environmentId: deleteTarget.id })
  }

  return (
    <>
      <Card className={dashboardCardClass}>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Environments</CardTitle>
            <CardDescription>
              Manage isolated secret stores. Each environment encrypts secrets
              independently.
            </CardDescription>
          </div>
          {canEdit ? (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1"
              onClick={() => {
                setCreateName('')
                setCreateError(null)
                setCreateOpen(true)
              }}
            >
              <DashboardIcon
                icon={Add01Icon}
                size="sm"
                data-icon="inline-start"
              />
              New environment
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {envsQuery.isPending ? (
            <div className="flex flex-col divide-y divide-border px-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : envs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <DashboardIcon
                  icon={Layers01Icon}
                  size="lg"
                  className="text-muted-foreground"
                />
              </div>
              <div>
                <p className="text-sm font-medium">No environments yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run{' '}
                  <code className="rounded bg-muted px-1 font-mono text-xs">
                    envy push
                  </code>{' '}
                  or create one manually.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {envs.map((env) => (
                <li
                  key={env.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* left: icon + name + created */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                      <DashboardIcon
                        icon={Layers01Icon}
                        size="sm"
                        className="text-muted-foreground"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium">
                        {env.name}
                      </p>
                      {env.createdAt ? (
                        <p className="text-xs text-muted-foreground">
                          Created{' '}
                          {new Date(env.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* right: count + actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            to="/dashboard/$projectSlug/secrets"
                            params={{ projectSlug }}
                            className="flex items-center gap-1"
                          />
                        }
                      >
                        <Badge
                          variant="secondary"
                          className="gap-1 font-mono tabular-nums"
                        >
                          <DashboardIcon
                            icon={Key01Icon}
                            size="xs"
                            className="text-muted-foreground"
                          />
                          {env.secretsCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {env.secretsCount === 1
                          ? '1 secret — view in Secrets'
                          : `${env.secretsCount} secrets — view in Secrets`}
                      </TooltipContent>
                    </Tooltip>

                    {canEdit ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Rename ${env.name}`}
                                onClick={() => openRename(env)}
                              />
                            }
                          >
                            <DashboardIcon icon={Edit01Icon} size="sm" />
                          </TooltipTrigger>
                          <TooltipContent>Rename</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Delete ${env.name}`}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteTarget(env)}
                              />
                            }
                          >
                            <DashboardIcon icon={Delete01Icon} size="sm" />
                          </TooltipTrigger>
                          <TooltipContent>Delete environment</TooltipContent>
                        </Tooltip>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setCreateName('')
            setCreateError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New environment</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-2">
            <Field data-invalid={createError ? true : undefined}>
              <FieldLabel htmlFor="env-create-name">Name</FieldLabel>
              <Input
                id="env-create-name"
                value={createName}
                onChange={(e) => {
                  setCreateName(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
                  )
                  setCreateError(null)
                }}
                placeholder="production"
                className="font-mono text-sm"
                autoFocus
                aria-invalid={!!createError}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
              />
              <FieldDescription>
                Lowercase letters, numbers, hyphens and underscores only.
              </FieldDescription>
              {createError ? <FieldError>{createError}</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createMutation.isPending || !createName.trim()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
            setRenameName('')
            setRenameError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename environment</DialogTitle>
          </DialogHeader>
          <FieldGroup className="py-2">
            <Field data-invalid={renameError ? true : undefined}>
              <FieldLabel htmlFor="env-rename-name">New name</FieldLabel>
              <Input
                id="env-rename-name"
                value={renameName}
                onChange={(e) => {
                  setRenameName(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
                  )
                  setRenameError(null)
                }}
                placeholder="staging"
                className="font-mono text-sm"
                autoFocus
                aria-invalid={!!renameError}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                }}
              />
              <FieldDescription>
                Note: CLI configs referencing the old name will need updating.
              </FieldDescription>
              {renameError ? <FieldError>{renameError}</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRename}
              disabled={
                renameMutation.isPending ||
                !renameName.trim() ||
                renameName.trim() === renameTarget?.name
              }
            >
              {renameMutation.isPending ? 'Renaming…' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete environment</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting{' '}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                {deleteTarget?.name}
              </code>{' '}
              will permanently erase all{' '}
              <strong>
                {deleteTarget?.secretsCount ?? 0} secret
                {(deleteTarget?.secretsCount ?? 0) !== 1 ? 's' : ''}
              </strong>{' '}
              inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete environment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
