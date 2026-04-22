import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@envy/ui/components/command'
import {
  BookOpen01Icon,
  FolderGitIcon,
  LockIcon,
  PlusSignIcon,
  Settings01Icon,
  TerminalIcon,
  UserGroupIcon,
  WorkHistoryIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'
import type { DashboardProject, DashboardSection } from './dashboard-types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProject: DashboardProject | null
  section: DashboardSection
  onSectionChange: (s: DashboardSection) => void
  onSelectProject: (p: DashboardProject) => void
  onNewProject: () => void
}

function copy(text: string, msg: string) {
  void navigator.clipboard.writeText(text).then(
    () => {
      toast.success(msg)
    },
    () => toast.error('Could not copy')
  )
}

export function CommandPalette({
  open,
  onOpenChange,
  currentProject,
  section,
  onSectionChange,
  onSelectProject,
  onNewProject
}: Props) {
  const trpc = useTRPC()
  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const projects = projectsQuery.data ?? []

  function close() {
    onOpenChange(false)
  }

  function goTo(s: DashboardSection) {
    if (!currentProject) {
      toast.message('Select a project first')
      return
    }
    onSectionChange(s)
    close()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton>
      <Command>
        <CommandInput placeholder="Jump to section, project, or copy CLI…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Navigate">
            <CommandItem
              value="secrets"
              onSelect={() => goTo('secrets')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={LockIcon} size="md" />
              Secrets
              {section === 'secrets' && currentProject ? (
                <CommandShortcut>current</CommandShortcut>
              ) : null}
            </CommandItem>
            <CommandItem
              value="members"
              onSelect={() => goTo('members')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={UserGroupIcon} size="md" />
              Members
            </CommandItem>
            <CommandItem
              value="audit"
              onSelect={() => goTo('audit')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={WorkHistoryIcon} size="md" />
              Audit log
            </CommandItem>
            <CommandItem
              value="settings"
              onSelect={() => goTo('settings')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={Settings01Icon} size="md" />
              Settings
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.slug} ${p.plan}`}
                onSelect={() => {
                  onSelectProject(p)
                  close()
                }}
              >
                <DashboardIcon icon={FolderGitIcon} size="md" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 rounded bg-muted px-1 font-mono text-[10px] uppercase text-muted-foreground">
                  {p.plan}
                </span>
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                  {p.slug}
                </span>
                {currentProject?.id === p.id ? (
                  <CommandShortcut>active</CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
            {projects.length === 0 && !projectsQuery.isLoading ? (
              <CommandItem disabled>No projects yet</CommandItem>
            ) : null}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="CLI">
            <CommandItem
              value="copy push envy push"
              onSelect={() => {
                copy('envy push', 'Copied envy push')
                close()
              }}
            >
              <DashboardIcon icon={TerminalIcon} size="md" />
              Copy <code className="font-mono">envy push</code>
            </CommandItem>
            <CommandItem
              value="copy pull envy pull"
              onSelect={() => {
                copy('envy pull', 'Copied envy pull')
                close()
              }}
            >
              <DashboardIcon icon={TerminalIcon} size="md" />
              Copy <code className="font-mono">envy pull</code>
            </CommandItem>
            <CommandItem
              value="docs cli"
              onSelect={() => {
                window.open(
                  'https://docs.useenvy.dev/cli',
                  '_blank',
                  'noopener,noreferrer'
                )
                close()
              }}
            >
              <DashboardIcon icon={BookOpen01Icon} size="md" />
              Open CLI docs
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Create">
            <CommandItem
              value="new project"
              onSelect={() => {
                onNewProject()
                close()
              }}
            >
              <DashboardIcon icon={PlusSignIcon} size="md" />
              New project
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
