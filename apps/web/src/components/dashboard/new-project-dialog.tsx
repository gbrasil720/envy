import { Button } from '@envy/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@envy/ui/components/input-group'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: (project: { id: string; name: string; slug: string }) => void
}

function toSlug(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NewProjectDialog({ open, onClose, onSuccess }: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.list.queryOptions())
        queryClient.invalidateQueries(trpc.me.get.queryOptions())
        onSuccess(data)
        onClose()
        setName('')
      }
    })
  )

  function handleCreate() {
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim() })
  }

  const slugPreview = name ? toSlug(name) : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Create a project to sync encrypted environment variables across
            machines.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="py-2">
          <Field data-invalid={createMutation.isError ? true : undefined}>
            <FieldLabel htmlFor="project-name">Name</FieldLabel>
            <InputGroup>
              <InputGroupAddon
                align="inline-start"
                className="font-mono text-muted-foreground"
              >
                /
              </InputGroupAddon>
              <InputGroupInput
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-project"
                className="font-mono text-sm"
                autoFocus
                aria-invalid={createMutation.isError}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
              />
            </InputGroup>
            {slugPreview ? (
              <FieldDescription>
                URL slug:{' '}
                <span className="font-mono text-foreground">{slugPreview}</span>
              </FieldDescription>
            ) : (
              <FieldDescription>
                Slug is generated from the name (lowercase, hyphenated).
              </FieldDescription>
            )}
            {createMutation.isError ? (
              <FieldError>{createMutation.error.message}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
