import { useDashboardActions, useDashboardShell } from './dashboard-context'
import type { DashboardSection } from './dashboard-types'

const SECTION_LABEL: Record<DashboardSection, string> = {
  secrets: 'secrets',
  projectSettings: 'settings',
  organization: 'settings',
  members: 'members',
  billing: 'billing',
  audit: 'audit'
}

type Props = {
  onOpenCommand: () => void
  onOpenMobileSidebar: () => void
}

export function AppTopbar({ onOpenCommand, onOpenMobileSidebar }: Props) {
  const { openNewProject, openAddSecret } = useDashboardActions()
  const { currentProject, section, isHome, canManageProjects } =
    useDashboardShell()

  const breadcrumb = isHome
    ? 'workspace / projects'
    : currentProject
      ? `${currentProject.slug} / ${SECTION_LABEL[section]}`
      : `workspace / ${SECTION_LABEL[section]}`

  const primaryLabel =
    isHome && canManageProjects
      ? '+ new project'
      : section === 'secrets'
        ? '+ add secret'
        : null

  function handlePrimary() {
    if (isHome) {
      openNewProject()
      return
    }
    if (section === 'secrets' && openAddSecret) {
      openAddSecret()
    }
  }

  const primaryEnabled =
    (isHome && canManageProjects) || (section === 'secrets' && !!openAddSecret)

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="cursor-pointer font-mono text-[12px] text-text-muted md:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="truncate font-mono text-[12px] text-text-muted">
          {breadcrumb}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden cursor-pointer rounded border border-ghost-border px-2.5 py-1 font-mono text-[11px] text-text-muted transition-colors hover:border-border-focus hover:text-text-secondary sm:inline-flex"
        >
          search… ⌘K
        </button>
        {primaryLabel && primaryEnabled ? (
          <button
            type="button"
            onClick={handlePrimary}
            className="cursor-pointer rounded bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-white"
          >
            {primaryLabel}
          </button>
        ) : null}
      </div>
    </header>
  )
}
