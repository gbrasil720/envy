# Plan 015: One invalidation helper for secret mutations — kill the magic `limit: 50`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- apps/web/src/components/dashboard/secrets-table.tsx apps/web/src/components/dashboard/secret-add-dialog.tsx apps/web/src/components/dashboard/secret-edit-dialog.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Exception: Plans 013/014 legitimately
> touch these files — if their status is DONE in `plans/README.md`, re-read the
> live mutation blocks and adapt line references; the pattern to replace
> (per-mutation exact-input invalidations) will still be recognizable.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordinate with 013/014 — sequential, any order)
- **Category**: bug | tech-debt
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

Three secret mutations invalidate the audit-log cache with a hardcoded exact input `{ projectId, limit: 50 }`. TanStack Query's default invalidation matches by query key, and the tRPC integration builds the key from the **exact input** — but the actual audit consumers cache under different inputs (`audit-log.tsx` uses a stateful `limit`/`offset`; `secrets-stats.tsx` uses `limit: 1`). Result: after adding/editing/deleting a secret, the visible audit log and "last activity" stat can stay stale — a live bug in the product's audit-trail claim. The same three sites also copy-paste the whole invalidate/reset dance. One helper concentrates the invalidation rules so consumers can never drift from mutators again.

## Current state

- `apps/web/src/components/dashboard/secret-add-dialog.tsx:42-56` — push mutation `onSuccess`:

```ts
queryClient.invalidateQueries(
  trpc.secrets.reveal.queryOptions({ projectId, environment })
)
queryClient.invalidateQueries(
  trpc.auditLog.list.queryOptions({ projectId, limit: 50 })
)
```

- `apps/web/src/components/dashboard/secret-edit-dialog.tsx:54-65` — update mutation `onSuccess`: identical two invalidations.
- `apps/web/src/components/dashboard/secrets-table.tsx:95-115` — delete mutation `onSuccess`: same two plus `trpc.environments.list.queryOptions({ projectId })`.
- Consumers whose keys do NOT match `{ projectId, limit: 50 }`:
  - `apps/web/src/components/dashboard/audit-log.tsx:74-81` — `auditLog.list` with stateful `limit`, `offset: 0`, optional `environment`.
  - `apps/web/src/components/dashboard/secrets-stats.tsx` (~line 51) — `auditLog.list` with `{ projectId, environment, limit: 1, offset: 0 }`.
- tRPC client setup: `apps/web/src/utils/trpc.ts` exposes `useTRPC()` (the `@trpc/tanstack-react-query` proxy). That proxy provides per-procedure key helpers — `trpc.auditLog.list.queryKey(input?)` and `trpc.auditLog.list.queryFilter(input?)` — where calling with **no/partial input** yields a key/filter that matches **all** cached entries of that procedure (prefix matching). Verify by inspection of usage or types; this is the load-bearing mechanism.
- There is no shared mutation/invalidation helper anywhere under `apps/web/src/lib` or `apps/web/src/hooks` (verify with a quick glob).
- Web test infra: only `apps/web/src/utils/initials.test.ts` exists; `@testing-library/react` + `jsdom` are installed but unwired. The helper below is deliberately DOM-free so it can be unit-tested with plain `bun:test` + a real `QueryClient`.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

Target design — new module `apps/web/src/lib/secret-scope.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import type { useTRPC } from '@/utils/trpc'

type TRPC = ReturnType<typeof useTRPC>

/**
 * Invalidate everything that renders secret state for a project:
 * secret values, key lists, environment counts, audit trail, stats.
 * Path-level filters — matches ALL cached inputs of each procedure
 * for this project, so consumers can never drift from mutators.
 */
export function invalidateSecretScope(
  queryClient: QueryClient,
  trpc: TRPC,
  projectId: string
) {
  return Promise.all([
    queryClient.invalidateQueries(trpc.secrets.reveal.queryFilter({ projectId })),
    queryClient.invalidateQueries(trpc.environments.list.queryFilter({ projectId })),
    queryClient.invalidateQueries(trpc.auditLog.list.queryFilter({ projectId }))
  ])
}
```

(If Plan 013 landed, add `trpc.secrets.list.queryFilter({ projectId })` to the list.) The three mutation sites call this helper and keep only their local UI resets (`onClose`, `setKey('')`, `setDeletingKey(null)`, …) inline.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `bun run check-types` | exit 0 |
| Web unit test | `cd apps/web && bun test src/lib/secret-scope.test.ts` | all pass |
| Web dev (manual) | `bun run dev` | web on :3001 |

## Scope

**In scope**:
- `apps/web/src/lib/secret-scope.ts` (create)
- `apps/web/src/lib/secret-scope.test.ts` (create)
- `apps/web/src/components/dashboard/secret-add-dialog.tsx`
- `apps/web/src/components/dashboard/secret-edit-dialog.tsx`
- `apps/web/src/components/dashboard/secrets-table.tsx` (the delete-mutation `onSuccess` only)

**Out of scope** (do NOT touch):
- The other ~8 `useMutation` sites (members, projects, environments, onboarding…) — same disease, separate dose; migrating them is follow-up once this pattern proves out.
- `audit-log.tsx`, `secrets-stats.tsx` — consumers stay as they are; the fix is on the mutator side.
- Any server code.

## Git workflow

- Branch: `advisor/015-secret-scope-invalidation`
- Conventional commits, e.g. `fix(web): path-level invalidation for secret mutations`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the filter mechanism

Open `apps/web/src/utils/trpc.ts` and confirm the client comes from `@trpc/tanstack-react-query` (`createTRPCContext`/`createTRPCOptionsProxy` style). Then confirm `queryFilter` exists on a procedure proxy: `cd apps/web && bunx tsc --noEmit` on a scratch usage, or simply write step 2 and let `bun run check-types` arbitrate. If `queryFilter` does not exist in the installed version, use the equivalent: `queryClient.invalidateQueries({ queryKey: trpc.auditLog.list.queryKey({ projectId }) })` — but note exact-key semantics differ; in that fallback, call `.queryKey()` **without input** filtered manually by predicate:

```ts
queryClient.invalidateQueries({
  queryKey: trpc.auditLog.list.queryKey(),
  predicate: (q) => JSON.stringify(q.queryKey).includes(projectId)
})
```

Prefer `queryFilter({ projectId })`; use the predicate fallback only if it doesn't exist, and say so in your report.

**Verify**: `bun run check-types` → exit 0 with the chosen mechanism in `secret-scope.ts`.

### Step 2: Create the helper

Write `apps/web/src/lib/secret-scope.ts` as specified in Current state → Target design. Include `trpc.secrets.list.queryFilter({ projectId })` **only if** `secrets.list` exists in the router (Plan 013 landed — check `packages/api/src/routers/secrets.ts`).

**Verify**: `bun run check-types` → exit 0.

### Step 3: Switch the three mutation sites

In each of `secret-add-dialog.tsx`, `secret-edit-dialog.tsx`, `secrets-table.tsx` (delete mutation): replace the hand-rolled `queryClient.invalidateQueries(...)` calls in `onSuccess` with a single `invalidateSecretScope(queryClient, trpc, projectId)`. Keep every local reset line exactly as is.

**Verify**: `grep -rn "limit: 50" apps/web/src/components/dashboard/` → zero matches. `bun run check-types` → exit 0.

### Step 4: Unit-test the helper

`apps/web/src/lib/secret-scope.test.ts`, plain `bun:test`, no DOM (model file layout on `apps/web/src/utils/initials.test.ts`):

- Build a real `QueryClient`; seed it with `queryClient.setQueryData` under keys produced by the actual trpc proxy helpers for **divergent inputs**: `auditLog.list` with `{ projectId, limit: 1, offset: 0 }` and `{ projectId, limit: 50, offset: 0 }`, plus `secrets.reveal` with `{ projectId, environment: 'development' }`, plus one entry for a **different** projectId. Constructing the proxy outside React: use `createTRPCOptionsProxy` from `@trpc/tanstack-react-query` with a stub client — mirror however `apps/web/src/utils/trpc.ts` builds it; if that requires React context, fall back to asserting key shapes: build keys via the same helper the app uses.
- Call `invalidateSecretScope`; assert every seeded query for the target project is marked invalidated (`queryClient.getQueryState(key)?.isInvalidated === true`) and the other project's entry is not.

**Verify**: `cd apps/web && bun test src/lib/secret-scope.test.ts` → pass. Manual regression: `bun run dev` → add a secret → the audit log panel and "last activity" stat update without a page refresh.

## Test plan

Covered in step 4. Cases: (1) divergent-input audit queries both invalidated, (2) reveal query invalidated, (3) cross-project isolation. Structural pattern: `apps/web/src/utils/initials.test.ts` (plain bun:test in-source).

**Verification**: `cd apps/web && bun test` → all pass (2 test files now).

## Done criteria

- [ ] `grep -rn "limit: 50" apps/web/src/components/dashboard/` → zero matches
- [ ] `grep -rln "invalidateSecretScope" apps/web/src/components/dashboard/` → exactly the three mutation files
- [ ] `cd apps/web && bun test` exits 0 including the new helper test
- [ ] `bun run check-types` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Neither `queryFilter` nor `queryKey` exists on the procedure proxy (unknown tRPC integration version) — report what `apps/web/src/utils/trpc.ts` actually uses.
- The test in step 4 cannot construct trpc query keys outside React context after one honest attempt with `createTRPCOptionsProxy` — ship steps 1–3 with the manual regression check, mark the plan PARTIAL in the index, and report the blocker (do not fake the test with hand-written key literals; wrong keys make the test lie).
- The three mutation sites have been restructured beyond recognition (a broader refactor landed) — reconcile against the live code, and if a shared helper already exists, extend it instead of duplicating.

## Maintenance notes

- Follow-up: migrate the remaining `useMutation` sites (members invite/remove, environments, projects) onto scope-level helpers (`invalidateMemberScope`, …) once this proves out; the audit finding counts 11 sites total.
- Reviewers: the semantic change is invalidation breadth — path-level instead of exact-input. Over-invalidation here is cheap (a couple of refetches); under-invalidation was the bug.
- If a future change adds a new consumer of `auditLog.list`, it inherits correct freshness automatically — that's the point; don't add exact-input invalidations again.
