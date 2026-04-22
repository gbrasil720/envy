import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import { Separator } from '@envy/ui/components/separator'
import { cn } from '@envy/ui/lib/utils'
import {
  Copy01Icon,
  LockIcon,
  Settings01Icon,
  TerminalIcon,
  UserGroupIcon,
  WorkHistoryIcon
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { toast } from 'sonner'
import { dashboardInsetCardClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'
import type { DashboardProject, DashboardSection } from './dashboard-types'
import { ProjectSwitcher } from './project-switcher'
import { UserCard } from './user-card'

const WORKSPACE_NAV: {
  id: DashboardSection
  label: string
  icon: IconSvgElement
}[] = [
  { id: 'secrets', label: 'Secrets', icon: LockIcon },
  { id: 'members', label: 'Members', icon: UserGroupIcon },
  { id: 'audit', label: 'Audit log', icon: WorkHistoryIcon }
]

const CONFIG_NAV: {
  id: DashboardSection
  label: string
  icon: IconSvgElement
}[] = [{ id: 'settings', label: 'Settings', icon: Settings01Icon }]

type Props = {
  currentProject: DashboardProject | null
  section: DashboardSection
  onSectionChange: (s: DashboardSection) => void
  onSelectProject: (p: DashboardProject) => void
  onNewProject: () => void
}

function copySnippet(text: string, label: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Could not copy')
  )
}

export function AppSidebar({
  currentProject,
  section,
  onSectionChange,
  onSelectProject,
  onNewProject
}: Props) {
  const planLabel = currentProject?.plan
    ? `${currentProject.plan} plan`
    : 'Select a project'

  function NavButton({
    item,
    disabled
  }: {
    item: (typeof WORKSPACE_NAV)[number] | (typeof CONFIG_NAV)[number]
    disabled: boolean
  }) {
    const active = section === item.id && currentProject && !disabled
    return (
      <button
        type="button"
        onClick={() => onSectionChange(item.id)}
        disabled={disabled}
        title={disabled ? 'Select a project first' : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-40',
          active
            ? 'bg-brand/10 font-medium text-brand'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <DashboardIcon
          icon={item.icon}
          size="nav"
          data-icon="inline-start"
          className={active ? 'text-brand' : undefined}
        />
        {item.label}
      </button>
    )
  }

  return (
    <aside className="flex min-w-[240px] max-w-[240px] flex-col border-r border-border bg-card/60 backdrop-blur-xl">
      <div className="border-b border-border p-2.5">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 font-display text-sm font-semibold text-brand">
            e
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight">
              envy
            </p>
            <p className="text-[10px] text-muted-foreground">Projects</p>
          </div>
        </div>
        <ProjectSwitcher
          currentProject={currentProject}
          onSelect={onSelectProject}
          onNewProject={onNewProject}
        />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {WORKSPACE_NAV.map((item) => (
          <NavButton key={item.id} item={item} disabled={!currentProject} />
        ))}
        <Separator className="my-2" />
        <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Configuration
        </p>
        {CONFIG_NAV.map((item) => (
          <NavButton key={item.id} item={item} disabled={!currentProject} />
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <details className="group mb-2 rounded-xl border border-border/80 bg-muted/30">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
            <DashboardIcon
              icon={TerminalIcon}
              size="sm"
              className="text-muted-foreground"
            />
            CLI quick reference
            <span className="ml-auto text-[10px] text-muted-foreground transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="flex flex-col gap-2 border-t border-border px-2 py-2">
            <Card className={dashboardInsetCardClass}>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Push
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 p-2 pt-0">
                <code className="break-all rounded-lg bg-muted px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
                  envy push
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-7 w-full gap-1"
                  onClick={() => copySnippet('envy push', 'Command')}
                >
                  <DashboardIcon
                    icon={Copy01Icon}
                    size="xs"
                    data-icon="inline-start"
                  />
                  Copy
                </Button>
              </CardContent>
            </Card>
            <Card className={dashboardInsetCardClass}>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Pull
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 p-2 pt-0">
                <code className="break-all rounded-lg bg-muted px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
                  envy pull
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-7 w-full gap-1"
                  onClick={() => copySnippet('envy pull', 'Command')}
                >
                  <DashboardIcon
                    icon={Copy01Icon}
                    size="xs"
                    data-icon="inline-start"
                  />
                  Copy
                </Button>
              </CardContent>
            </Card>
          </div>
        </details>
        <UserCard planLabel={planLabel} />
      </div>
    </aside>
  )
}
