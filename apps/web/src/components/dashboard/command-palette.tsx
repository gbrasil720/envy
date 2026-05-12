import { Avatar, AvatarFallback } from '@envy/ui/components/avatar'
import { Badge } from '@envy/ui/components/badge'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@envy/ui/components/command'
import { Skeleton } from '@envy/ui/components/skeleton'
import { cn } from '@envy/ui/lib/utils'
import {
  BookOpen01Icon,
  LockIcon,
  PlusSignIcon,
  Search01Icon,
  Settings01Icon,
  TerminalIcon,
  UserGroupIcon,
  WorkHistoryIcon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { Command as CommandPrimitive } from 'cmdk'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'
import type { DashboardProject, DashboardSection } from './dashboard-types'

const RECENT_STORAGE_KEY = 'envy:cmdk:recent'

type RecentEntry =
  | { type: 'project'; id: string }
  | { type: 'section'; section: DashboardSection }

type ResolvedRecentRow =
  | {
      kind: 'project'
      entry: Extract<RecentEntry, { type: 'project' }>
      p: DashboardProject
    }
  | { kind: 'section'; entry: Extract<RecentEntry, { type: 'section' }> }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProject: DashboardProject | null
  section: DashboardSection
  onSectionChange: (s: DashboardSection) => void
  onSelectProject: (p: DashboardProject) => void
  onNewProject: () => void
}

const SECTION_ICON: Record<DashboardSection, typeof LockIcon> = {
  secrets: LockIcon,
  members: UserGroupIcon,
  audit: WorkHistoryIcon,
  settings: Settings01Icon
}

const SECTION_LABEL: Record<DashboardSection, string> = {
  secrets: 'Secrets',
  members: 'Members',
  audit: 'Audit log',
  settings: 'Settings'
}

function loadRecent(): RecentEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is RecentEntry => {
        if (!item || typeof item !== 'object') return false
        const o = item as Record<string, unknown>
        if (o.type === 'project' && typeof o.id === 'string') return true
        if (
          o.type === 'section' &&
          typeof o.section === 'string' &&
          ['secrets', 'members', 'audit', 'settings'].includes(o.section)
        ) {
          return true
        }
        return false
      })
      .slice(0, 5)
  } catch {
    return []
  }
}

function persistRecent(entries: RecentEntry[]) {
  try {
    localStorage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify(entries.slice(0, 5))
    )
  } catch {
    /* ignore quota */
  }
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function copy(text: string, msg: string) {
  void navigator.clipboard.writeText(text).then(
    () => {
      toast.success(msg)
    },
    () => toast.error('Could not copy')
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-card px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
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

  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<RecentEntry[]>([])

  useEffect(() => {
    if (open) {
      setRecent(loadRecent())
      setSearch('')
    }
  }, [open])

  function close() {
    onOpenChange(false)
  }

  function pushRecent(entry: RecentEntry) {
    setRecent((prev) => {
      const filtered = prev.filter((e) => {
        if (e.type === 'project' && entry.type === 'project') {
          return e.id !== entry.id
        }
        if (e.type === 'section' && entry.type === 'section') {
          return e.section !== entry.section
        }
        return true
      })
      const next = [entry, ...filtered].slice(0, 5)
      persistRecent(next)
      return next
    })
  }

  function goTo(s: DashboardSection) {
    if (!currentProject) {
      toast.message('Select a project first')
      return
    }
    pushRecent({ type: 'section', section: s })
    onSectionChange(s)
    close()
  }

  const showPinned = search.trim().length === 0

  const resolvedRecentRows = useMemo((): ResolvedRecentRow[] => {
    return recent.flatMap((entry): ResolvedRecentRow[] => {
      if (entry.type === 'project') {
        const p = projects.find((proj) => proj.id === entry.id)
        if (!p) return []
        return [{ kind: 'project', entry, p }]
      }
      return [{ kind: 'section', entry }]
    })
  }, [recent, projects])

  const groupHeadingClass =
    '**:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-muted-foreground/80'

  const itemClass = 'gap-3 px-3 py-2.5 text-sm rounded-lg'

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton
      title="Command palette"
      description="Search projects, jump to a section, or run CLI actions."
      className={cn(
        'top-2 max-h-[calc(100vh-1rem)] translate-y-0 gap-0 overflow-hidden p-0 shadow-2xl shadow-black/20 sm:top-[12vh] sm:max-w-2xl'
      )}
    >
      <Command className="rounded-xl text-sm">
        <div
          data-slot="command-input-wrapper"
          className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-3"
        >
          <DashboardIcon
            icon={Search01Icon}
            size="lg"
            className="text-muted-foreground"
            aria-hidden
          />
          <CommandPrimitive.Input
            placeholder="Jump to section, project, or copy CLI…"
            value={search}
            onValueChange={setSearch}
            aria-label="Command palette search"
            className="placeholder:text-muted-foreground flex h-full min-w-0 flex-1 bg-transparent text-base outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <CommandList className="max-h-[min(85vh,640px)] scroll-py-1 sm:max-h-[min(60vh,520px)]">
          <CommandEmpty className="py-10">
            <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-center">
              <DashboardIcon
                icon={Search01Icon}
                size="lg"
                className="text-muted-foreground"
                aria-hidden
              />
              <p className="text-sm font-medium">No matches</p>
              <p className="text-xs text-muted-foreground">
                Try a project name, &quot;envy push&quot;, or
                &quot;members&quot;.
              </p>
            </div>
          </CommandEmpty>

          {showPinned && resolvedRecentRows.length > 0 ? (
            <>
              <CommandGroup heading="Recent" className={groupHeadingClass}>
                {resolvedRecentRows.map((row) => {
                  if (row.kind === 'project') {
                    const { p } = row
                    return (
                      <CommandItem
                        key={`recent-project-${p.id}`}
                        value={`recent project ${p.name} ${p.slug}`}
                        className={itemClass}
                        onSelect={() => {
                          pushRecent({ type: 'project', id: p.id })
                          onSelectProject(p)
                          close()
                        }}
                      >
                        <Avatar className="size-7 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-brand/15 text-[10px] font-bold text-brand">
                            {initials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                            {p.slug}
                          </div>
                        </div>
                      </CommandItem>
                    )
                  }
                  const { entry } = row
                  const Icon = SECTION_ICON[entry.section]
                  return (
                    <CommandItem
                      key={`recent-section-${entry.section}`}
                      value={`recent ${SECTION_LABEL[entry.section]} ${entry.section}`}
                      className={itemClass}
                      disabled={!currentProject}
                      onSelect={() => goTo(entry.section)}
                    >
                      <DashboardIcon icon={Icon} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {SECTION_LABEL[entry.section]}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {currentProject
                            ? `In ${currentProject.name}`
                            : 'Select a project first'}
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          {showPinned ? (
            <>
              <CommandGroup
                heading="Quick actions"
                className={groupHeadingClass}
              >
                <CommandItem
                  value="quick new project create"
                  className={itemClass}
                  onSelect={() => {
                    onNewProject()
                    close()
                  }}
                >
                  <DashboardIcon icon={PlusSignIcon} size="md" />
                  <span className="font-medium">New project</span>
                </CommandItem>
                <CommandItem
                  value="quick copy envy push"
                  className={itemClass}
                  onSelect={() => {
                    copy('envy push', 'Copied envy push')
                    close()
                  }}
                >
                  <DashboardIcon icon={TerminalIcon} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span>
                        Copy <Kbd>envy push</Kbd>
                      </span>
                      <CommandShortcut className="hidden font-normal sm:inline">
                        ⌘C
                      </CommandShortcut>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Push secrets from your machine to Envy
                    </p>
                  </div>
                </CommandItem>
                <CommandItem
                  value="quick copy envy pull"
                  className={itemClass}
                  onSelect={() => {
                    copy('envy pull', 'Copied envy pull')
                    close()
                  }}
                >
                  <DashboardIcon icon={TerminalIcon} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span>
                        Copy <Kbd>envy pull</Kbd>
                      </span>
                      <CommandShortcut className="hidden font-normal sm:inline">
                        ⌘C
                      </CommandShortcut>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pull secrets from Envy into a local file
                    </p>
                  </div>
                </CommandItem>
                <CommandItem
                  value="quick open cli docs documentation"
                  className={itemClass}
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
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Open CLI docs</div>
                    <p className="text-xs text-muted-foreground">
                      Reference for install, auth, push, and pull
                    </p>
                  </div>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          <CommandGroup
            heading={
              currentProject ? 'Navigate' : 'Navigate (select a project first)'
            }
            className={groupHeadingClass}
          >
            <CommandItem
              value="secrets section navigation"
              className={itemClass}
              onSelect={() => goTo('secrets')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={LockIcon} size="md" />
              <span className="min-w-0 flex-1 font-medium">Secrets</span>
              {section === 'secrets' && currentProject ? (
                <Badge
                  variant="outline"
                  className="ml-auto shrink-0 text-[10px]"
                >
                  Current
                </Badge>
              ) : null}
            </CommandItem>
            <CommandItem
              value="members section navigation"
              className={itemClass}
              onSelect={() => goTo('members')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={UserGroupIcon} size="md" />
              <span className="min-w-0 flex-1 font-medium">Members</span>
              {section === 'members' && currentProject ? (
                <Badge
                  variant="outline"
                  className="ml-auto shrink-0 text-[10px]"
                >
                  Current
                </Badge>
              ) : null}
            </CommandItem>
            <CommandItem
              value="audit audit log section navigation"
              className={itemClass}
              onSelect={() => goTo('audit')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={WorkHistoryIcon} size="md" />
              <span className="min-w-0 flex-1 font-medium">Audit log</span>
              {section === 'audit' && currentProject ? (
                <Badge
                  variant="outline"
                  className="ml-auto shrink-0 text-[10px]"
                >
                  Current
                </Badge>
              ) : null}
            </CommandItem>
            <CommandItem
              value="settings section navigation"
              className={itemClass}
              onSelect={() => goTo('settings')}
              disabled={!currentProject}
            >
              <DashboardIcon icon={Settings01Icon} size="md" />
              <span className="min-w-0 flex-1 font-medium">Settings</span>
              {section === 'settings' && currentProject ? (
                <Badge
                  variant="outline"
                  className="ml-auto shrink-0 text-[10px]"
                >
                  Current
                </Badge>
              ) : null}
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Projects" className={groupHeadingClass}>
            {projectsQuery.isLoading
              ? (['sk-a', 'sk-b', 'sk-c'] as const).map((skKey) => (
                  <div
                    key={skKey}
                    className="flex items-center gap-3 px-3 py-2.5"
                    aria-hidden
                  >
                    <Skeleton className="size-7 shrink-0 rounded-lg" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-[55%] rounded-md" />
                      <Skeleton className="h-3 w-[40%] rounded-md" />
                    </div>
                  </div>
                ))
              : null}
            {!projectsQuery.isLoading &&
              projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.slug} ${p.plan}`}
                  className={itemClass}
                  onSelect={() => {
                    pushRecent({ type: 'project', id: p.id })
                    onSelectProject(p)
                    close()
                  }}
                >
                  <Avatar className="size-7 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-brand/15 text-[10px] font-bold text-brand">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.slug}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] uppercase"
                  >
                    {p.plan}
                  </Badge>
                  {currentProject?.id === p.id ? (
                    <Badge className="shrink-0 text-[10px]">Current</Badge>
                  ) : null}
                </CommandItem>
              ))}
            {!projectsQuery.isLoading && projects.length === 0 ? (
              <CommandItem disabled className={itemClass}>
                No projects yet
              </CommandItem>
            ) : null}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="CLI" className={groupHeadingClass}>
            <CommandItem
              value="copy push envy push"
              className={itemClass}
              onSelect={() => {
                copy('envy push', 'Copied envy push')
                close()
              }}
            >
              <DashboardIcon icon={TerminalIcon} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span>
                    Copy <Kbd>envy push</Kbd>
                  </span>
                  <CommandShortcut className="hidden font-normal sm:inline">
                    ⌘C
                  </CommandShortcut>
                </div>
                <p className="text-xs text-muted-foreground">
                  Push secrets from your machine to Envy
                </p>
              </div>
            </CommandItem>
            <CommandItem
              value="copy pull envy pull"
              className={itemClass}
              onSelect={() => {
                copy('envy pull', 'Copied envy pull')
                close()
              }}
            >
              <DashboardIcon icon={TerminalIcon} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span>
                    Copy <Kbd>envy pull</Kbd>
                  </span>
                  <CommandShortcut className="hidden font-normal sm:inline">
                    ⌘C
                  </CommandShortcut>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pull secrets from Envy into a local file
                </p>
              </div>
            </CommandItem>
            <CommandItem
              value="docs cli documentation"
              className={itemClass}
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
              <div className="min-w-0 flex-1">
                <div className="font-medium">Open CLI docs</div>
                <p className="text-xs text-muted-foreground">
                  Reference for install, auth, push, and pull
                </p>
              </div>
            </CommandItem>
          </CommandGroup>

          {!showPinned ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Create" className={groupHeadingClass}>
                <CommandItem
                  value="new project"
                  className={itemClass}
                  onSelect={() => {
                    onNewProject()
                    close()
                  }}
                >
                  <DashboardIcon icon={PlusSignIcon} size="md" />
                  New project
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>

        <div
          aria-hidden="true"
          className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span className="hidden sm:inline">select</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span className="hidden sm:inline">move</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>esc</Kbd>
              <span className="hidden sm:inline">close</span>
            </span>
          </div>
          <span className="shrink-0 font-mono text-muted-foreground">envy</span>
        </div>
      </Command>
    </CommandDialog>
  )
}
