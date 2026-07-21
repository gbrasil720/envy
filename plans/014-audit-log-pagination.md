# Plan 014: Fix audit-log pagination — real pages, server-side filters, no 100-row wall

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- apps/web/src/components/dashboard/audit-log.tsx packages/api/src/routers/auditLog.ts packages/api/src/routers/auditLog.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

The audit log's "load more" is broken three ways. It grows `limit` while keeping `offset: 0`, so every click refetches all previously loaded rows; the server caps `limit` at 100, so the second click (limit 150) makes the query **throw** and the whole list error out; and the secrets/members/cli action filter runs client-side over only the loaded window, silently hiding older matching entries. For a secrets manager, the audit trail is a headline feature — pagination that dies at 100 rows undermines it.

## Current state

- `packages/api/src/routers/auditLog.ts` (66 lines, single `list` procedure):

```ts
// auditLog.ts:10-17
.input(
  z.object({
    projectId: z.string(),
    environment: z.string().optional(),
    userId: z.string().optional(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().default(0)
  })
)
```

Conditions built from `projectId` + optional `environment`/`userId` (lines 24–30); ordered `desc(auditLog.createdAt)` with `limit`/`offset` (43–45); enriches rows with a user map and returns a **bare array** (lines 60–63). No action filter exists server-side.

- `apps/web/src/components/dashboard/audit-log.tsx`:

```ts
// audit-log.tsx:72-81
const [limit, setLimit] = useState(50)

const auditQuery = useQuery(
  trpc.auditLog.list.queryOptions({
    projectId,
    limit,
    offset: 0,
    ...(envFilter !== 'all' ? { environment: envFilter } : {})
  })
)
```

```ts
// audit-log.tsx:193-201 ("load more")
{auditQuery.data && auditQuery.data.length >= limit ? (
  ...
  onClick={() => setLimit((l) => l + 50)}
```

Client-side category filter (lines 85–98) over the loaded rows using `SECRET_ACTIONS` (imported from `@envy/api/lib/audit-actions` — `SECRET_AUDIT_ACTIONS`), plus local `MEMBER_ACTIONS` / `CLI_ACTIONS` sets (lines 15–16).

- Consumers of the same query elsewhere: `apps/web/src/components/dashboard/secrets-stats.tsx` calls `auditLog.list` with `limit: 1, offset: 0`; several mutations invalidate `auditLog.list` with `{ projectId, limit: 50 }` (see Plan 015 — do not fix those here).
- Canonical action strings: `packages/api/src/lib/audit-actions.ts` — `AUDIT_ACTIONS` = `pushed, revealed, secrets_updated, secrets_deleted, environment_created, environment_renamed, environment_deleted`; `SECRET_AUDIT_ACTIONS` set = first four.
- Tests: model on `packages/api/src/routers/environments.test.ts` (real Postgres via `createCaller`, `truncateAll`, factories). Check whether `auditLog.test.ts` exists; extend it if so, create it if not.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

Target design:

- Server: add optional `actions: z.array(z.string()).optional()` to the input; when present, add `inArray(auditLog.action, input.actions)` to the conditions (`inArray` is already imported in the file). Keep the response a bare array — page composition stays client-side to avoid breaking `secrets-stats.tsx`.
- Client: fixed `PAGE_SIZE = 50`; state `const [pages, setPages] = useState(1)`; fetch each page with `offset: (page - 1) * PAGE_SIZE` via `useQueries`-free simple accumulation: keep it minimal with `useQuery` per current page + accumulated rows in state, OR the simpler robust route — a single query with `offset` advancing and rows accumulated in a `useRef`/state list. Choose the **accumulation** approach spelled out in step 2 (no `useInfiniteQuery` — the tRPC integration here exposes `queryOptions`, and hand-rolled accumulation keeps the diff small). Category filter moves server-side by passing the action set for the active filter tab; the client-side `filtered` memo goes away.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Postgres up | `bun run db:docker:up` | container healthy |
| API tests | `cd packages/api && bun test routers/auditLog 2>/dev/null || cd packages/api && bun test` | all pass |
| Typecheck | `bun run check-types` | exit 0 |
| Web dev (manual) | `bun run dev` | web on :3001 |

## Scope

**In scope**:
- `packages/api/src/routers/auditLog.ts`
- `apps/web/src/components/dashboard/audit-log.tsx`
- `packages/api/src/routers/auditLog.test.ts` (create or extend)

**Out of scope** (do NOT touch):
- `apps/web/src/components/dashboard/secrets-stats.tsx` — its `limit: 1` call keeps working because the router input stays backward-compatible.
- The mutation-side invalidations with `{ projectId, limit: 50 }` — Plan 015 owns those.
- `packages/api/src/lib/audit-actions.ts` — add no new actions here; `MEMBER_ACTIONS`/`CLI_ACTIONS` drift is a separate finding.

## Git workflow

- Branch: `advisor/014-audit-log-pagination`
- Conventional commits, e.g. `fix(web): audit log pagination and server-side action filter`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Server — optional `actions` filter

In `auditLog.ts` input, add `actions: z.array(z.string()).optional()`; in the conditions block:

```ts
if (input.actions && input.actions.length > 0) {
  conditions.push(inArray(auditLog.action, input.actions))
}
```

**Verify**: `bun run check-types` → exit 0.

### Step 2: Client — page accumulation

In `audit-log.tsx`:

1. `const PAGE_SIZE = 50`; replace `limit` state with `const [offset, setOffset] = useState(0)` and `const [rows, setRows] = useState<AuditRow[]>([])` (derive `AuditRow` from the query data type, e.g. `type AuditRow = NonNullable<typeof auditQuery.data>[number]` placed after the query — or inline the shape).
2. Compute the server-side action set from the active tab:

```ts
const actionSets: Record<ActionFilter, string[] | undefined> = {
  all: undefined,
  secrets: [...SECRET_ACTIONS],
  members: [...MEMBER_ACTIONS],
  cli: [...CLI_ACTIONS]
}
```

3. Query one page: `trpc.auditLog.list.queryOptions({ projectId, limit: PAGE_SIZE, offset, ...(envFilter !== 'all' ? { environment: envFilter } : {}), ...(actionSets[actionFilter] ? { actions: actionSets[actionFilter] } : {}) })`.
4. Accumulate: `useEffect` on `auditQuery.data` — if `offset === 0` replace `rows`, else append (dedupe by `id` when appending, since a mutation-triggered refetch of page 0 may overlap). Reset `offset` to 0 and `rows` to `[]` whenever `envFilter` or `actionFilter` changes (a `useEffect` on those, or perform the reset inside the filter `onClick`/`onChange` handlers — prefer the handlers; Biome's `useExhaustiveDependencies` is enforced).
5. "load more": `onClick={() => setOffset((o) => o + PAGE_SIZE)}`; show the button when the **last fetched page** was full (`auditQuery.data?.length === PAGE_SIZE`).
6. Delete the `filtered` `useMemo` — render `rows` directly (server now filters). Keep the loading skeleton for the initial load (`auditQuery.isLoading && rows.length === 0`) and the existing empty states.

**Verify**: `bun run check-types` → exit 0. Manual (`bun run dev`, project with >100 audit entries — generate via repeated secret pushes if needed): click "load more" twice → no error, list grows past 100, network tab shows `offset: 50` then `offset: 100`, each response ≤50 rows; switching to the "secrets" tab refetches with `actions` in the payload.

## Test plan

In `packages/api/src/routers/auditLog.test.ts` (create if missing; model structure and factories on `environments.test.ts`):

1. Seed >2 pages of audit rows (insert directly into `auditLog` or via repeated `pushSecrets`); `list` with `limit: 50, offset: 50` returns the second page, no overlap with page one (compare ids), ordered by `createdAt` desc.
2. `list` with `actions: ['pushed']` returns only `pushed` rows; combined with `environment` filter, both apply.
3. `limit: 100` accepted; the zod max still rejects `limit: 150` (assert the error) — documents the cap the client must respect.
4. Access: non-member of the project → authorization error (mirror existing access-denial assertions).

**Verification**: `cd packages/api && bun test` → all pass.

## Done criteria

- [ ] `grep -n "offset: 0" apps/web/src/components/dashboard/audit-log.tsx` → no hardcoded zero inside the query options (offset is stateful)
- [ ] `grep -n "setLimit" apps/web/src/components/dashboard/audit-log.tsx` → zero matches
- [ ] Server accepts and applies `actions` filter (test 2 passes)
- [ ] `bun run check-types` exits 0; `cd packages/api && bun test` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `secrets-stats.tsx` (out of scope) breaks type-wise from the router change — the input additions are optional and must be backward-compatible; if typecheck flags it, the change was made wrong, re-check step 1.
- The component has drifted (e.g. Plan 015 restructured its invalidations) beyond recognition of the excerpts.
- Biome's `useExhaustiveDependencies` cannot be satisfied for the accumulation effect without a suppression comment — report the shape you tried rather than adding `biome-ignore`.

## Maintenance notes

- Plan 015's invalidation helper should invalidate `auditLog.list` broadly (path-level), which composes with this plan's paged queries — pages refetch and the accumulation effect replaces/dedupes.
- Deferred: cursor-based pagination (`createdAt` cursor) would be more robust against inserts between page fetches than offset paging; revisit if duplicate/skipped rows are observed in practice (the id-dedupe in step 2.4 mitigates duplicates).
- The local `MEMBER_ACTIONS`/`CLI_ACTIONS` sets reference actions the server never emits (`member_invited`, `pulled`) — known drift, tracked separately (audit-catalog finding); this plan intentionally keeps the sets as-is.
