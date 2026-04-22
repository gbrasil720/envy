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
import { Textarea } from '@envy/ui/components/textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'

type Props = {
  open: boolean
  onClose: () => void
  projectId: string
  environment: string
}

export function SecretAddDialog({
  open,
  onClose,
  projectId,
  environment
}: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)

  const pushMutation = useMutation(
    trpc.secrets.push.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.secrets.reveal.queryOptions({ projectId, environment })
        )
        queryClient.invalidateQueries(
          trpc.auditLog.list.queryOptions({ projectId, limit: 50 })
        )
        onClose()
        setKey('')
        setValue('')
        setKeyError(null)
      }
    })
  )

  function handleKeyChange(val: string) {
    setKey(val.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
    setKeyError(null)
  }

  function handleAdd() {
    if (!key.trim()) {
      setKeyError('Key is required')
      return
    }
    if (!value.trim()) return
    pushMutation.mutate({
      projectId,
      environment,
      secrets: { [key.trim()]: value }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Add secret</DialogTitle>
        </DialogHeader>
        <FieldGroup className="py-2">
          <Field data-invalid={keyError ? true : undefined}>
            <FieldLabel htmlFor="secret-key">Key</FieldLabel>
            <Input
              id="secret-key"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="DATABASE_URL"
              className="font-mono text-sm"
              autoFocus
              aria-invalid={!!keyError}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            {keyError ? <FieldError>{keyError}</FieldError> : null}
          </Field>
          <Field data-invalid={pushMutation.isError ? true : undefined}>
            <FieldLabel htmlFor="new-secret-value">Value</FieldLabel>
            <Textarea
              id="new-secret-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="postgres://…"
              className="min-h-[88px] resize-y font-mono text-sm"
              aria-invalid={pushMutation.isError}
              autoComplete="off"
              spellCheck={false}
            />
            <FieldDescription>
              Encrypted with AES-256-GCM in the browser before upload. Multiline
              values are OK.
            </FieldDescription>
            {pushMutation.isError ? (
              <FieldError>{pushMutation.error.message}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={pushMutation.isPending || !key.trim() || !value.trim()}
          >
            {pushMutation.isPending ? 'Adding…' : 'Add secret'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
