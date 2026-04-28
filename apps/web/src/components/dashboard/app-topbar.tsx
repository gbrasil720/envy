import { Badge } from '@envy/ui/components/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@envy/ui/components/breadcrumb'
import { Button } from '@envy/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import { cn } from '@envy/ui/lib/utils'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { dashboardPlanBadgeClass } from './dashboard-classes'
import { DashboardIcon } from './dashboard-icon'
import type { DashboardProject, DashboardSection } from './dashboard-types'

const SECTION_LABEL: Record<DashboardSection, string> = {
  secrets: 'Secrets',
  members: 'Members',
  audit: 'Audit',
  settings: 'Settings'
}

type Props = {
  currentProject: DashboardProject | null
  section: DashboardSection
  onOpenCommand: () => void
}

export function AppTopbar({ currentProject, section, onOpenCommand }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/60 backdrop-blur-xl px-4 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {currentProject ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[140px] truncate font-medium md:max-w-[200px]">
                  {currentProject.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="flex items-center gap-2">
                <BreadcrumbPage>{SECTION_LABEL[section]}</BreadcrumbPage>
                <Badge
                  className={cn(
                    'text-[10px] font-medium',
                    dashboardPlanBadgeClass(currentProject.plan)
                  )}
                >
                  {currentProject.plan === 'free'
                    ? 'Free'
                    : currentProject.plan.charAt(0).toUpperCase() +
                      currentProject.plan.slice(1)}
                </Badge>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <span className="text-sm text-muted-foreground">
            Select a project to get started
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="hidden font-mono text-[10px] sm:inline-flex"
                onClick={onOpenCommand}
              />
            }
          >
            <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
            <span className="ml-1">Command</span>
          </TooltipTrigger>
          <TooltipContent>Search and jump</TooltipContent>
        </Tooltip>
        <a
          href="https://docs.useenvy.dev/cli"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="CLI documentation (opens in new tab)"
        >
          envy --help
          <DashboardIcon
            icon={ArrowUpRight01Icon}
            size="xs"
            className="opacity-60"
            aria-hidden
          />
        </a>
      </div>
    </header>
  )
}
