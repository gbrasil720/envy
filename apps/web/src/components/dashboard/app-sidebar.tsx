import { PLAN_LIMITS, type Plan } from '@envy/api/lib/plan-limits'
import { Sheet, SheetContent } from '@envy/ui/components/sheet'
import { cn } from '@envy/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { EnvyWordmark } from '@/components/brand'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'
import { useDashboardShell } from './dashboard-context'
import type { DashboardProject, DashboardSection } from './dashboard-types'
import { OrganizationSwitcher } from './organization-switcher'
import { ProjectSwitcher } from './project-switcher'
import { UserCard } from './user-card'

const PROJECT_NAV: { id: DashboardSection; label: string }[] = [
  { id: 'secrets', label: 'secrets' },
  { id: 'projectSettings', label: 'settings' }
]

const ORGANIZATION_NAV: { id: DashboardSection; label: string }[] = [
  { id: 'organization', label: 'settings' },
  { id: 'members', label: 'members' },
  { id: 'billing', label: 'billing' },
  { id: 'audit', label: 'audit log' }
]

type Props = {
  mobileOpen: boolean
  onMobileClose: () => void
}

type InnerProps = {
  onAfterNavigate?: () => void
}

function SidebarInner({ onAfterNavigate }: InnerProps) {
  const trpc = useTRPC()
  const {
    currentProject,
    section,
    isHome,
    onSectionChange,
    onSelectProject,
    onNewProject,
    onGoHome,
    organizationId,
    canManageProjects
  } = useDashboardShell()
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const projectsQuery = useQuery({
    ...trpc.projects.list.queryOptions({ organizationId }),
    enabled: !!activeOrganization && activeOrganization.id === organizationId
  })
  const billingQuery = useQuery({
    ...trpc.billing.status.queryOptions({ organizationId }),
    enabled: !!activeOrganization && activeOrganization.id === organizationId
  })
  const projects = projectsQuery.data ?? []

  // Plans and limits belong to an organization, never to the user account.
  // DashboardLayout has already resolved the selected project's billing state.
  const plan = (currentProject?.plan ?? billingQuery.data?.plan) as
    | Plan
    | undefined
  const workspaceProjects = projects
  const secretLimit = plan ? PLAN_LIMITS[plan].secrets : null
  const secretUsed = workspaceProjects.reduce(
    (total, project) => total + (project.secretsCount ?? 0),
    0
  )
  const isUnlimited = secretLimit == null || !Number.isFinite(secretLimit)
  const usagePct =
    isUnlimited || secretLimit == null
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
        <OrganizationSwitcher />
      </div>

      <div className="px-5 pt-4 pb-1.5 font-mono text-[9.5px] tracking-[0.1em] text-text-muted">
        PROJECTS
      </div>
      <div className="mx-3">
        <ProjectSwitcher
          currentProject={currentProject}
          onSelect={selectProject}
          onNewProject={onNewProject}
          onAllProjects={goHome}
        />
      </div>
      {!currentProject && projects.length === 0 && canManageProjects ? (
        <p className="px-5 pt-2 font-mono text-[10.5px] text-text-muted">
          Create your first project from this menu.
        </p>
      ) : null}

      {currentProject && !isHome ? (
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
      ) : null}

      <div className="px-5 pt-5 pb-1.5 font-mono text-[9.5px] tracking-[0.1em] text-text-muted">
        ORGANIZATION
      </div>
      <nav className="flex flex-col gap-px px-3">
        {ORGANIZATION_NAV.map((item) => {
          const active = !currentProject && section === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goSection(item.id)}
              className={cn(
                'flex cursor-pointer items-center rounded px-3 py-2 text-left font-mono text-[12px] transition-colors',
                active
                  ? 'bg-ghost-bg text-text-primary'
                  : 'text-text-secondary hover:bg-ghost-bg hover:text-text-primary'
              )}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-border px-5 py-4">
        <div className="mb-1.5 flex justify-between font-mono text-[10px] text-text-muted">
          <span>ORGANIZATION SECRETS</span>
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
        <UserCard
          plan={plan ?? null}
          workspaceName={activeOrganization?.name}
          organizationId={organizationId}
          organizationSlug={activeOrganization?.slug}
        />
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
