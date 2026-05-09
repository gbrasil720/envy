import { Avatar, AvatarFallback } from '@envy/ui/components/avatar'
import { Button } from '@envy/ui/components/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@envy/ui/components/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@envy/ui/components/popover'
import {
  ArrowUpDownIcon,
  FolderGitIcon,
  PlusSignIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'
import type { DashboardProject } from './dashboard-types'

type Props = {
  currentProject: DashboardProject | null
  onSelect: (project: DashboardProject) => void
  onNewProject: () => void
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

export function ProjectSwitcher({
  currentProject,
  onSelect,
  onNewProject
}: Props) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)

  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const projects = projectsQuery.data ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls="project-switcher-listbox"
            className="h-9 w-full justify-between rounded-xl border-border bg-muted/40 px-2.5 font-normal hover:bg-muted/60"
          />
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          {currentProject ? (
            <>
              <Avatar className="size-5 rounded-lg">
                <AvatarFallback className="rounded-lg bg-brand/15 text-[9px] font-bold text-brand">
                  {initials(currentProject.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">
                {currentProject.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Select project
            </span>
          )}
        </div>
        <DashboardIcon
          icon={ArrowUpDownIcon}
          size="sm"
          className="text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent className="w-[260px] rounded-xl p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList id="project-switcher-listbox">
            <CommandEmpty>
              {projectsQuery.isLoading ? 'Loading…' : 'No projects found.'}
            </CommandEmpty>
            {projects.length > 0 ? (
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${project.name} ${project.slug}`}
                    onSelect={() => {
                      onSelect(project)
                      setOpen(false)
                    }}
                    className="rounded-none"
                  >
                    <Avatar className="size-6 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-brand/15 text-[9px] font-bold text-brand">
                        {initials(project.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {project.name}
                      </div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {project.slug}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="new project create"
                onSelect={() => {
                  onNewProject()
                  setOpen(false)
                }}
                className="rounded-none"
              >
                <DashboardIcon icon={PlusSignIcon} size="md" />
                New project
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  ⌘N
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
