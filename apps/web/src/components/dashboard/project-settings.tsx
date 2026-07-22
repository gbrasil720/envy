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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { EnvironmentsManager } from './environments-manager'

type Props = {
  project: {
    id: string
    name: string
    slug: string
    plan: string
    role: string
    organizationId: string
    createdAt?: string | Date
  }
  secretsCount: number
  onUpgrade: () => void
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Could not copy')
  }
}

export function ProjectSettings({ project }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isOwner = project.role === 'owner'

  const archiveMutation = useMutation(
    trpc.organization.archive.mutationOptions({
      onSuccess: async () => {
        toast.success('Project archived')
        setDeleteOpen(false)
        await queryClient.invalidateQueries()
        void navigate({ to: '/dashboard' })
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to archive project')
      }
    })
  )

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-7 py-7">
      <section>
        <div className="mb-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
          PROJECT
        </div>
        <label
          htmlFor="settings-project-name"
          className="mb-1.5 block text-[12.5px] font-semibold text-text-primary"
        >
          Project name
        </label>
        <div className="mb-5 flex gap-2.5">
          <input
            id="settings-project-name"
            value={project.name}
            readOnly
            className="min-w-0 flex-1 rounded border border-ghost-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-text-primary outline-none"
          />
          <button
            type="button"
            onClick={() => void copyText(project.name, 'Name')}
            className="cursor-pointer rounded bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            Copy
          </button>
        </div>

        <label
          htmlFor="settings-project-slug"
          className="mb-1.5 block text-[12.5px] font-semibold text-text-primary"
        >
          Slug
        </label>
        <div className="mb-5 flex gap-2.5">
          <input
            id="settings-project-slug"
            value={project.slug}
            readOnly
            className="min-w-0 flex-1 rounded border border-ghost-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-text-primary outline-none"
          />
          <button
            type="button"
            onClick={() => void copyText(project.slug, 'Slug')}
            className="cursor-pointer rounded border border-ghost-border px-4 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary"
          >
            Copy
          </button>
        </div>

        {project.createdAt ? (
          <p className="font-mono text-[11px] text-text-muted">
            created {new Date(project.createdAt).toLocaleString()}
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted">
          ENVIRONMENTS
        </div>
        <EnvironmentsManager
          projectId={project.id}
          projectSlug={project.slug}
          role={project.role}
        />
      </section>

      <section className="rounded border border-danger/30 p-5">
        <div className="mb-3 font-mono text-[10px] tracking-[0.08em] text-danger">
          DANGER ZONE
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-text-secondary">
            Archive this project and hide it from the dashboard. Data is
            retained for compliance.
          </span>
          <button
            type="button"
            disabled={!isOwner}
            onClick={() => setDeleteOpen(true)}
            title={
              isOwner ? undefined : 'Only the organization owner can archive'
            }
            className="shrink-0 cursor-pointer rounded border border-danger/50 px-3.5 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Archive project
          </button>
        </div>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-md border-ghost-border bg-[#0e0f0e]">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project</AlertDialogTitle>
            <AlertDialogDescription>
              Archive{' '}
              <strong className="text-text-primary">{project.name}</strong>? It
              will disappear from your dashboard. Data is soft-deleted (not
              permanently erased).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              disabled={archiveMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                archiveMutation.mutate({
                  organizationId: project.organizationId
                })
              }}
            >
              {archiveMutation.isPending ? 'Archiving…' : 'Archive project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
