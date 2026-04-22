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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '@envy/ui/components/input-group'
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'

type Props = {
  open?: boolean
  onClose: () => void
  projectId: string
  environment: string
  secretKey: string
  currentValue: string
}

export function SecretEditDialog({
  open = true,
  onClose,
  projectId,
  environment,
  secretKey,
  currentValue
}: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(currentValue)
  const [showValue, setShowValue] = useState(false)

  useEffect(() => {
    if (open) setValue(currentValue)
  }, [open, currentValue])

  const updateMutation = useMutation(
    trpc.secrets.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.secrets.reveal.queryOptions({ projectId, environment })
        )
        queryClient.invalidateQueries(
          trpc.auditLog.list.queryOptions({ projectId, limit: 50 })
        )
        onClose()
      }
    })
  )

  function handleSave() {
    updateMutation.mutate({ projectId, environment, key: secretKey, value })
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
          <DialogTitle className="font-mono text-sm">Edit secret</DialogTitle>
        </DialogHeader>
        <FieldGroup className="py-2">
          <Field>
            <FieldLabel>Key</FieldLabel>
            <div className="rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
              {secretKey}
            </div>
          </Field>
          <Field data-invalid={updateMutation.isError ? true : undefined}>
            <FieldLabel htmlFor="secret-value">Value</FieldLabel>
            <InputGroup className="min-h-[88px] items-stretch py-0">
              <InputGroupTextarea
                id="secret-value"
                data-slot="input-group-control"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`min-h-[80px] resize-y font-mono text-sm ${showValue ? '' : 'opacity-90'}`}
                autoFocus
                aria-invalid={updateMutation.isError}
                spellCheck={false}
                autoComplete="off"
              />
              <InputGroupAddon
                align="inline-end"
                className="border-l border-border"
              >
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setShowValue((s) => !s)}
                  aria-label={showValue ? 'Hide value' : 'Show value'}
                >
                  {showValue ? (
                    <DashboardIcon icon={ViewOffIcon} size="sm" />
                  ) : (
                    <DashboardIcon icon={ViewIcon} size="sm" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Encrypted with AES-256-GCM before upload.
            </FieldDescription>
            {updateMutation.isError ? (
              <FieldError>{updateMutation.error.message}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending || value === currentValue}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
