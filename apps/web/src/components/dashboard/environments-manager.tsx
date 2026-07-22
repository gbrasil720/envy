import { envNameSchema } from '@envy/api/lib/env-name'
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'

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

function validateEnvName(name: string): string | null {
  const result = envNameSchema.safeParse(name)
  if (!result.success) return result.error.errors[0].message
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
      <div className="flex flex-wrap gap-2">
        {envsQuery.isPending
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 w-24 animate-pulse rounded border border-ghost-border bg-ghost-bg"
              />
            ))
          : envs.map((env) => (
              <div
                key={env.id}
                className="group flex items-center gap-1.5 rounded border border-ghost-border px-3 py-1.5 font-mono text-[11.5px] text-text-primary"
              >
                <Link
                  to="/dashboard/$projectSlug/secrets"
                  params={{ projectSlug }}
                  className="hover:text-brand"
                  title={`${env.secretsCount} secrets`}
                >
                  {env.name}
                  <span className="ml-1.5 text-text-muted">
                    {env.secretsCount}
                  </span>
                </Link>
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openRename(env)}
                      className="ml-1 cursor-pointer text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary"
                      aria-label={`Rename ${env.name}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(env)}
                      className="cursor-pointer text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                      aria-label={`Delete ${env.name}`}
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </div>
            ))}
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setCreateName('')
              setCreateError(null)
              setCreateOpen(true)
            }}
            className="cursor-pointer rounded border border-dashed border-ghost-border px-3 py-1.5 font-mono text-[11.5px] text-text-muted transition-colors hover:border-border-focus hover:text-text-primary"
          >
            + add
          </button>
        ) : null}
      </div>

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
