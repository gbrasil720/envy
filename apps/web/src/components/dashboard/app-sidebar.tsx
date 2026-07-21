import { PLAN_LIMITS, type Plan } from '@envy/api/lib/plan-limits'
import { Sheet, SheetContent } from '@envy/ui/components/sheet'
import { cn } from '@envy/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { EnvyWordmark } from '@/components/brand'
import { useTRPC } from '@/utils/trpc'
import { useDashboardShell } from './dashboard-context'
import type { DashboardProject, DashboardSection } from './dashboard-types'
import { ProjectSwitcher } from './project-switcher'
import { UserCard } from './user-card'

const PROJECT_NAV: { id: DashboardSection; label: string }[] = [
  { id: 'secrets', label: 'secrets' },
  { id: 'members', label: 'members' },
  { id: 'audit', label: 'audit log' },
  { id: 'settings', label: 'settings' }
]

type Props = {
  mobileOpen: boolean
  onMobileClose: () => void
}

type InnerProps = {
  onAfterNavigate?: () => void
}

function SidebarInner({
  onAfterNavigate
}: InnerProps) {
  const trpc = useTRPC()
  const { currentProject, section, isHome, onSectionChange, onSelectProject, onNewProject, onGoHome } = useDashboardShell()
  const meQuery = useQuery(trpc.me.get.queryOptions())
  const projectsQuery = useQuery(trpc.projects.list.queryOptions())
  const projects = projectsQuery.data ?? []

  const plan = (meQuery.data?.plan ?? 'free') as Plan
  const secretLimit = PLAN_LIMITS[plan].secrets
  const secretUsed = meQuery.data?.secretCount ?? 0
  const isUnlimited = !Number.isFinite(secretLimit)
  const usagePct = isUnlimited
    ? 0
    : Math.min(100, Math.round((secretUsed / secretLimit) * 100))
  const usageColor =
    !isUnlimited && usagePct >= 80
      ? 'var(--color-warning)'
      : 'var(--color-brand)'

  function goSection(s: DashboardSection) {
    onSectionChange(s)
    onAfterNavigate?.()
  }

  function selectProject(p: DashboardProject) {
    onSelectProject(p)
    onAfterNavigate?.()
  }

  function goHome() {
    onGoHome()
    onAfterNavigate?.()
  }

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="flex h-[52px] items-center border-b border-border px-5">
        <button
          type="button"
          onClick={goHome}
          title="Workspace home"
          className="cursor-pointer transition-colors hover:opacity-90"
        >
          <EnvyWordmark markSize={19} className="text-[14px]" />
        </button>
      </div>

      {currentProject && !isHome ? (
        <>
          <div className="mx-3 mt-3">
            <ProjectSwitcher
              currentProject={currentProject}
              onSelect={selectProject}
              onNewProject={onNewProject}
              onAllProjects={goHome}
            />
          </div>
          <nav className="mt-2 flex flex-col gap-px px-3">
            {PROJECT_NAV.map((item) => {
              const active = section === item.id
              const secretsMeta =
                item.id === 'secrets'
                  ? String(currentProject.secretsCount ?? 0)
                  : undefined
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goSection(item.id)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded px-3 py-2 text-left font-mono text-[12px] transition-colors',
                    active
                      ? 'bg-ghost-bg text-text-primary'
                      : 'text-text-secondary hover:bg-ghost-bg hover:text-text-primary'
                  )}
                >
                  <span>{item.label}</span>
                  {secretsMeta ? (
                    <span className="text-[10px] text-text-muted">
                      {secretsMeta}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </>
      ) : (
        <>
          <div className="px-5 pt-4 pb-1.5 font-mono text-[9.5px] tracking-[0.1em] text-text-muted">
            PROJECTS
          </div>
          <nav className="flex flex-col gap-px px-3">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProject(p)}
                className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-left font-mono text-[12px] text-text-secondary transition-colors hover:bg-ghost-bg hover:text-text-primary"
              >
                <span className="truncate">{p.name}</span>
                <span className="text-[10px] text-brand">●</span>
              </button>
            ))}
            {projects.length === 0 ? (
              <p className="px-3 py-2 font-mono text-[11px] text-text-muted">
                no projects yet
              </p>
            ) : null}
          </nav>
        </>
      )}

      <div className="mt-auto border-t border-border px-5 py-4">
        <div className="mb-1.5 flex justify-between font-mono text-[10px] text-text-muted">
          <span>SECRETS</span>
          <span>
            {isUnlimited
              ? `${secretUsed} · ∞`
              : `${secretUsed} / ${secretLimit}`}
          </span>
        </div>
        <div className="mb-3.5 h-[3px] rounded-sm bg-ghost-bg">
          <div
            className="h-[3px] rounded-sm transition-all"
            style={{
              width: isUnlimited ? '8%' : `${usagePct}%`,
              background: usageColor
            }}
          />
        </div>
        <UserCard planLabel={`${plan} plan`} />
      </div>
    </div>
  )
}

export function AppSidebar({ mobileOpen, onMobileClose, ...props }: Props) {
  return (
    <>
      <aside className="hidden w-[224px] shrink-0 flex-col border-r border-border md:flex">
        <SidebarInner {...props} />
      </aside>

      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => !open && onMobileClose()}
      >
        <SheetContent
          side="left"
          className="flex w-[260px] flex-col border-border bg-bg p-0"
          showCloseButton={false}
        >
          <SidebarInner {...props} onAfterNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}
