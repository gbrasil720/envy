import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import { Separator } from '@envy/ui/components/separator'
import { Sheet, SheetContent } from '@envy/ui/components/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import { cn } from '@envy/ui/lib/utils'
import {
  Copy01Icon,
  LockIcon,
  Settings01Icon,
  SidebarLeft01Icon,
  TerminalIcon,
  UserGroupIcon,
  WorkHistoryIcon
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { useState } from 'react'
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
  mobileOpen: boolean
  onMobileClose: () => void
}

type InnerProps = Omit<Props, 'mobileOpen' | 'onMobileClose'> & {
  onAfterNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function copySnippet(text: string, label: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Could not copy')
  )
}

function NavButton({
  item,
  disabled,
  collapsed,
  section,
  handleSectionChange
}: {
  item: (typeof WORKSPACE_NAV)[number] | (typeof CONFIG_NAV)[number]
  disabled: boolean
  collapsed: boolean
  section: DashboardSection
  handleSectionChange: (s: DashboardSection) => void
}) {
  const active = section === item.id && !disabled

  const btnClass = cn(
    'flex w-full items-center rounded-lg py-2 text-left text-sm transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-40',
    collapsed ? 'justify-center gap-0 px-0' : 'gap-2.5 px-2.5',
    active
      ? 'bg-brand/10 font-medium text-brand'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )

  const iconEl = (
    <DashboardIcon
      icon={item.icon}
      size="nav"
      data-icon="inline-start"
      className={active ? 'text-brand' : undefined}
    />
  )

  const labelEl = (
    <span
      className={cn(
        'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none',
        collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
      )}
    >
      {item.label}
    </span>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => handleSectionChange(item.id)}
              disabled={disabled}
              className={btnClass}
            />
          }
        >
          {iconEl}
          {labelEl}
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={() => handleSectionChange(item.id)}
      disabled={disabled}
      title={disabled ? 'Select a project first' : undefined}
      className={btnClass}
    >
      {iconEl}
      {labelEl}
    </button>
  )
}

function SidebarInner({
  currentProject,
  section,
  onSectionChange,
  onSelectProject,
  onNewProject,
  onAfterNavigate,
  collapsed = false,
  onToggleCollapse
}: InnerProps) {
  const planLabel = currentProject?.plan
    ? `${currentProject.plan} plan`
    : 'Select a project'

  function handleSectionChange(s: DashboardSection) {
    onSectionChange(s)
    onAfterNavigate?.()
  }

  function handleSelectProject(p: DashboardProject) {
    onSelectProject(p)
    onAfterNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: logo + project switcher */}
      <div
        className={cn(
          'border-b border-border',
          collapsed ? 'flex flex-col items-center gap-2 p-3' : 'p-2.5'
        )}
      >
        {collapsed ? (
          <>
            <img
              src="/logo-no-bg.png"
              alt="Envy"
              width={28}
              height={28}
              className="size-7 object-cover"
            />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <DashboardIcon
                  icon={SidebarLeft01Icon}
                  size="sm"
                  className="rotate-180"
                />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 px-1">
              <img
                src="/logo-no-bg.png"
                alt="Envy"
                width={40}
                height={40}
                className="size-10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold tracking-tight">
                  envy
                </p>
                <p className="text-[10px] text-muted-foreground">Projects</p>
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label="Collapse sidebar"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <DashboardIcon icon={SidebarLeft01Icon} size="sm" />
                </button>
              )}
            </div>
            <ProjectSwitcher
              currentProject={currentProject}
              onSelect={handleSelectProject}
              onNewProject={onNewProject}
            />
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {!collapsed && (
          <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
        )}
        {WORKSPACE_NAV.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            disabled={!currentProject}
            collapsed={collapsed}
            section={section}
            handleSectionChange={handleSectionChange}
          />
        ))}
        <Separator className="my-2" />
        {!collapsed && (
          <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Configuration
          </p>
        )}
        {CONFIG_NAV.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            disabled={!currentProject}
            collapsed={collapsed}
            section={section}
            handleSectionChange={handleSectionChange}
          />
        ))}
      </nav>

      {/* Footer: CLI reference + user */}
      <div className="border-t border-border p-2">
        {!collapsed && (
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
        )}
        <UserCard planLabel={planLabel} compact={collapsed} />
      </div>
    </div>
  )
}

function readCollapsedPref(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('envy:sidebar-collapsed') === 'true'
}

export function AppSidebar({ mobileOpen, onMobileClose, ...props }: Props) {
  const [collapsed, setCollapsed] = useState(readCollapsedPref)

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('envy:sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <>
      {/* Desktop: collapsible sidebar */}
      <aside
        className="hidden flex-col border-r border-border bg-card/60 backdrop-blur-xl transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:flex"
        style={{ width: collapsed ? 56 : 240 }}
      >
        <SidebarInner
          {...props}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile: sheet drawer (never collapses) */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => !open && onMobileClose()}
      >
        <SheetContent
          side="left"
          className="flex w-[260px] flex-col p-0 bg-card/95 backdrop-blur-xl"
          showCloseButton={false}
        >
          <SidebarInner {...props} onAfterNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}
