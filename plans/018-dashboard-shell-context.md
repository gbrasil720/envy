# Plan 018: One dashboard-shell context — stop drilling the current project through three components

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- apps/web/src/routes/dashboard.tsx apps/web/src/components/dashboard/app-sidebar.tsx apps/web/src/components/dashboard/app-topbar.tsx apps/web/src/components/dashboard/command-palette.tsx apps/web/src/components/dashboard/dashboard-context.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED — touches the shell every dashboard screen renders through
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

The dashboard shell derives `currentProject`, `section`, and five navigation callbacks in `dashboard.tsx` and drills them as 6–8 props into each of `AppSidebar`, `AppTopbar`, and `CommandPalette`. Every new shell surface (a breadcrumb, a status bar) must re-receive the same prop bundle, and every navigation change touches four files. An honest scoping note: the *duplicate fetches* flagged in the audit (`projects.list` in both shell and sidebar, `me.get` in sidebar and members route) share identical query keys, so React Query already dedupes them to one network request — the real cost is the interface, not the wire. This plan moves the shared shell state into the existing dashboard context module so the three consumers read one interface, and the duplicate `useQuery` declarations collapse as a side effect.

Deliberately **not** in this plan: unifying `DashboardProject` (from `projects.list`) with `CurrentProject` (from `projects.get` via `ProjectProvider` in `$projectSlug.tsx`). They are different server shapes serving different needs (list summary vs detail with role/plan). Merging them is an API-design decision — flagged for the maintainer, not an executor.

## Current state

- `apps/web/src/routes/dashboard.tsx:42-158` — `DashboardLayout`:

```ts
// dashboard.tsx:53-57
const projectsQuery = useQuery(trpc.projects.list.queryOptions())
const currentProject =
  projectsQuery.data?.find((p) => p.slug === projectSlug) ?? null
const section = deriveSection(pathname)
const isHome = !projectSlug
```

then the drilling (115–149): `<AppSidebar currentProject={…} section={…} isHome={…} onSectionChange={…} onSelectProject={…} onNewProject={…} onGoHome={…} mobileOpen={…} onMobileClose={…} />`, `<AppTopbar currentProject section isHome onOpenCommand onOpenMobileSidebar />`, `<CommandPalette open onOpenChange currentProject section onSectionChange onSelectProject onNewProject />`. Callbacks defined in the layout: `handleSelectProject` (72), `handleNewProjectSuccess` (79), `handleSectionChange` (91), `goHome` (105), `openNewProject` (59).

- `apps/web/src/components/dashboard/dashboard-context.tsx` — an existing context module (`DashboardActionsProvider` / `useDashboardActions`) already wraps the layout (`dashboard.tsx:113`) and is consumed by e.g. `secrets-table.tsx:54` (`registerOpenAddSecret`). **Extend this module** — do not create a second context file.
- `apps/web/src/components/dashboard/app-sidebar.tsx` — `SidebarInner` (from ~line 35) re-declares `const meQuery = useQuery(trpc.me.get.queryOptions())` and `const projectsQuery = useQuery(trpc.projects.list.queryOptions())` and receives 8 props of shell state.
- `apps/web/src/components/dashboard/app-topbar.tsx`, `command-palette.tsx` (636 lines) — receive the same `currentProject`/`section`/callbacks subset via props.
- `DashboardProject` type: exported from `apps/web/src/components/dashboard/dashboard-types.ts` (verify the exact export site with grep before writing imports).
- Sub-route project detail (`ProjectProvider`/`useCurrentProject` in `project-context.tsx`, fed by `projects.get` in `$projectSlug.tsx:29-31`) is a separate, correct seam — out of scope.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas; `useExhaustiveDependencies` enforced. Conventional commits.

Target design — extend `dashboard-context.tsx`:

```ts
export type DashboardShell = {
  currentProject: DashboardProject | null
  projects: DashboardProject[]
  projectsLoading: boolean
  section: DashboardSection
  isHome: boolean
  selectProject: (project: DashboardProject) => void
  changeSection: (s: DashboardSection) => void
  openNewProject: () => void
  goHome: () => void
}
```

Provided by `DashboardLayout` (values it already computes), consumed via a `useDashboardShell()` hook by `AppSidebar`, `AppTopbar`, `CommandPalette`. Props that remain props (open/close state owned by the layout): sidebar `mobileOpen`/`onMobileClose`, topbar `onOpenCommand`/`onOpenMobileSidebar`, palette `open`/`onOpenChange`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `bun run check-types` | exit 0 |
| Web tests | `cd apps/web && bun test` | all pass |
| Web dev (manual) | `bun run dev` | web on :3001 |

## Suggested executor toolkit

- If the `vercel-composition-patterns` skill is available, consult its context-provider guidance before step 1.

## Scope

**In scope**:
- `apps/web/src/components/dashboard/dashboard-context.tsx`
- `apps/web/src/routes/dashboard.tsx`
- `apps/web/src/components/dashboard/app-sidebar.tsx`
- `apps/web/src/components/dashboard/app-topbar.tsx`
- `apps/web/src/components/dashboard/command-palette.tsx`

**Out of scope** (do NOT touch):
- `project-context.tsx` / `$projectSlug.tsx` / any sub-route — the detail seam stays.
- `me.get` usage in `app-sidebar.tsx` (plan/usage data) and `members.tsx` — sidebar-specific data, not shell state; React Query dedupes the key.
- The tRPC procedures — no server change.
- `new-project-dialog.tsx` — keeps its props.

## Git workflow

- Branch: `advisor/018-dashboard-shell-context`
- Conventional commits, e.g. `refactor(web): dashboard shell context instead of prop drilling`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend `dashboard-context.tsx`

Add the `DashboardShell` type, a `DashboardShellContext` (default `null`), a `DashboardShellProvider({ value, children })`, and `useDashboardShell()` that throws outside the provider (mirror the error-throwing pattern `useCurrentProject` uses in `project-context.tsx`). Keep `DashboardActionsProvider` untouched.

**Verify**: `bun run check-types` → exit 0.

### Step 2: Provide from the layout

In `dashboard.tsx`, wrap the existing tree (inside `DashboardActionsProvider`) with `DashboardShellProvider`, passing the values/callbacks the layout already defines (`projects: projectsQuery.data ?? []`, `projectsLoading: projectsQuery.isLoading`, the rest per the target design). Memoize the value object (`useMemo`) keyed on its parts — the shell re-renders on every route change; an unstable context value forces sidebar+topbar+palette re-renders even when nothing changed.

**Verify**: `bun run check-types` → exit 0.

### Step 3: Consume, one component at a time

For each of `app-topbar.tsx` (smallest first), `app-sidebar.tsx`, `command-palette.tsx`:

1. Replace the drilled props (`currentProject`, `section`, `isHome`, `onSectionChange`, `onSelectProject`, `onNewProject`, `onGoHome`, and sidebar's `projects` sourcing) with `useDashboardShell()` reads. In `app-sidebar.tsx`, delete `SidebarInner`'s own `projectsQuery` — use `projects`/`projectsLoading` from the context (keep `meQuery`, it's sidebar data, out of scope).
2. Delete the corresponding prop-type fields and the call-site props in `dashboard.tsx`.
3. Typecheck before moving to the next component.

**Verify** (after each component): `bun run check-types` → exit 0. After all three: `grep -n "currentProject={" apps/web/src/routes/dashboard.tsx` → zero matches.

### Step 4: Manual regression pass

`bun run dev`, then walk: home → select project via sidebar → switch sections (secrets/members/audit/settings) → ⌘K palette: switch project, jump section, "new project" → mobile viewport: open/close sidebar → create a project (lands on its secrets page).

**Verify**: every navigation behaves as before; React DevTools (if available) shows sidebar not re-rendering on unrelated state changes (spot check, not a gate).

## Test plan

No web component-test infra exists yet (only `utils/initials.test.ts`; jsdom unwired — audit finding TESTS-03). Gates for this plan:

- `bun run check-types` → exit 0 (the prop-removal is fully type-checked; a missed call site cannot compile).
- `cd apps/web && bun test` → existing tests pass.
- The manual walk in step 4.

If component-test infra lands later, `useDashboardShell` throwing outside the provider is the first test to write.

## Done criteria

- [ ] `useDashboardShell` exported from `dashboard-context.tsx`; provider wraps the layout
- [ ] `grep -n "onSectionChange\|onSelectProject\|onGoHome" apps/web/src/routes/dashboard.tsx` → matches only inside the layout's own function definitions/provider value, not as JSX props to the three components
- [ ] `app-sidebar.tsx` no longer declares its own `projects.list` query
- [ ] `bun run check-types` exits 0; `cd apps/web && bun test` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `command-palette.tsx` consumes shell props in a way that can't map 1:1 to the context reads (636 lines — if its internal wiring diverges from the drift-check excerpts, reconcile before editing).
- `DashboardProject` type is not exported where expected — find it with grep; if the sidebar/palette use a *different* project shape than the layout passes, that's the two-shape problem this plan explicitly defers: report it.
- Step 4 reveals any navigation regression you cannot trace to a missed prop in one pass.

## Maintenance notes

- Deferred maintainer decision: unify `DashboardProject` (list shape) and `CurrentProject` (detail shape) — likely a `projects.get`-shaped summary in `projects.list` or a shared core type in `packages/api`. Revisit after this context proves out.
- New shell surfaces (breadcrumbs, status bar) should consume `useDashboardShell()` — adding props back to the layout call sites is a regression of this plan.
- Reviewers: check the `useMemo` dependency list on the provider value — a missing dep is a stale-navigation bug, an unstable value is a performance regression.
