import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@envy/ui/components/popover'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'
import { useDashboardShell } from './dashboard-context'
import type { DashboardProject } from './dashboard-types'

type Props = {
  currentProject: DashboardProject | null
  onSelect: (project: DashboardProject) => void
  onNewProject: () => void
  onAllProjects?: () => void
}

export function ProjectSwitcher({
  currentProject,
  onSelect,
  onNewProject,
  onAllProjects
}: Props) {
  const trpc = useTRPC()
  const { organizationId, canManageProjects } = useDashboardShell()
  const [open, setOpen] = useState(false)
  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({ organizationId })
  )
  const projects = projectsQuery.data ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-expanded={open}
            className="flex w-full cursor-pointer items-center justify-between rounded border border-ghost-border bg-surface-2 px-3 py-2 text-left text-text-primary transition-colors hover:border-border-focus"
          />
        }
      >
        <span className="truncate font-mono text-[12px]">
          {currentProject?.name ?? 'Select project'}
        </span>
        <span className="text-[10px] text-text-muted">{open ? '▴' : '▾'}</span>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[200px] rounded border-ghost-border bg-[#111312] p-1.5 shadow-md"
        align="start"
      >
        <div className="px-2.5 py-1.5 font-mono text-[9px] tracking-[0.1em] text-text-muted">
          SWITCH PROJECT
        </div>
        <div className="flex flex-col gap-0.5">
          {projects.map((project) => {
            const active = project.id === currentProject?.id
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  onSelect(project)
                  setOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-2 text-left font-mono text-[12px] text-text-primary transition-colors hover:bg-ghost-bg ${
                  active ? 'bg-ghost-bg' : ''
                }`}
              >
                <span className="truncate">{project.name}</span>
                <span className="text-[10px] text-brand">●</span>
              </button>
            )
          })}
        </div>
        <div className="my-1.5 border-t border-border" />
        {onAllProjects ? (
          <button
            type="button"
            onClick={() => {
              onAllProjects()
              setOpen(false)
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-left font-mono text-[11.5px] text-text-secondary transition-colors hover:bg-ghost-bg hover:text-text-primary"
          >
            ← all projects
          </button>
        ) : null}
        {canManageProjects ? (
          <button
            type="button"
            onClick={() => {
              onNewProject()
              setOpen(false)
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-left font-mono text-[11.5px] text-text-secondary transition-colors hover:bg-ghost-bg hover:text-text-primary"
          >
            + new project
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
