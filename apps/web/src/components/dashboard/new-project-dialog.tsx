'use client'

import { Dialog, DialogContent, DialogTitle } from '@envy/ui/components/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'

type Props = {
  open: boolean
  onClose: () => void
  organizationId: string
  onSuccess: (project: { id: string; name: string; slug: string }) => void
}

function toSlug(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NewProjectDialog({
  open,
  onClose,
  organizationId,
  onSuccess
}: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(
          trpc.projects.list.queryOptions({ organizationId })
        )
        queryClient.invalidateQueries(trpc.me.get.queryOptions())
        onSuccess(data)
        onClose()
        setName('')
      }
    })
  )

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (!toSlug(trimmed)) return
    createMutation.mutate({ name: trimmed, organizationId })
  }

  const canCreate = !!toSlug(name) && !createMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
          setName('')
        }
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden rounded-md border-ghost-border bg-[#0e0f0e] p-0 shadow-md sm:max-w-[480px]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <DialogTitle className="font-mono text-[10px] font-normal tracking-[0.1em] text-text-muted">
            NEW PROJECT
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-ghost-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted transition-colors hover:text-text-primary"
          >
            esc
          </button>
        </div>

        <div className="px-5 pt-6 pb-5">
          <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.015em] text-text-primary">
            Name your project
            <span className="text-brand">.</span>
          </h2>
          <p className="mb-5 text-[12.5px] leading-[1.6] text-text-secondary">
            Three environments are created with it. Push your first .env right
            after.
          </p>
          <label
            htmlFor="new-project-name"
            className="mb-1.5 block font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase"
          >
            PROJECT NAME
          </label>
          <input
            id="new-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-saas"
            autoFocus
            disabled={createMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            className="w-full rounded border border-input bg-surface-2 px-3 py-2.5 font-mono text-[13.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-focus"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {['development', 'staging', 'production'].map((env) => (
              <span
                key={env}
                className="rounded-full border border-brand/35 px-2.5 py-1 font-mono text-[10.5px] text-brand"
              >
                {env}
              </span>
            ))}
          </div>
          {createMutation.isError ? (
            <p className="mt-3 text-[12px] text-danger">
              {createMutation.error.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
          <span className="font-mono text-[10.5px] text-text-muted">
            $ envy init{' '}
            <span className="text-text-muted/60">does this too</span>
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-2.5 py-2 text-[12.5px] text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              className={`rounded px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                canCreate
                  ? 'cursor-pointer bg-primary text-primary-foreground hover:bg-white'
                  : 'cursor-not-allowed bg-primary/15 text-text-muted'
              }`}
            >
              {createMutation.isPending ? 'Creating…' : 'Create project →'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
