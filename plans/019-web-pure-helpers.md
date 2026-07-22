# Plan 019: Consolidate the web's duplicated pure helpers into tested modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- apps/web/src/utils apps/web/src/components/dashboard/audit-log.tsx apps/web/src/components/dashboard/secrets-stats.tsx apps/web/src/components/dashboard/members-list.tsx apps/web/src/components/dashboard/environments-manager.tsx`
> Exception: Plans 014/016 legitimately edit `audit-log.tsx`. If their status is
> DONE, re-read the live file — the `timeAgo` function this plan moves will
> still be recognizable. On any other mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordinate with 014/016 on `audit-log.tsx` — sequential)
- **Category**: tech-debt | tests
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

Small pure logic is re-implemented across dashboard components: relative-time formatting exists twice with different behaviors, `initials()` is re-implemented in `members-list.tsx` **despite** `apps/web/src/utils/initials.ts` already existing (and being the only tested code in the web app), and environment-name validation duplicates the server's zod rules by hand — a drift bug waiting for the first rule change. None of the copies are tested. Consolidating into `utils/` modules kills the drift and gives the web its second and third test files, extending the one testing pattern that already works here (plain `bun:test` on pure functions, no DOM needed).

## Current state

Duplicate 1 — relative time, two divergent implementations:

- `apps/web/src/components/dashboard/audit-log.tsx:46-59` — `timeAgo`: compact style (`now`, `5m`, `3h`, `2d`, then `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` after 30 days).
- `apps/web/src/components/dashboard/secrets-stats.tsx:27-40` — `formatLastActivity`: verbose style (`Just now`, `5m ago`, `3h ago`, `2d ago`, then `toLocaleDateString()` after 7 days), also handles `undefined` → `'—'`.

Duplicate 2 — initials:

- `apps/web/src/utils/initials.ts` — canonical, tested (`initials.test.ts`), signature `initials(name: string | null | undefined, email: string | null)` with email fallback then `'??'`.
- `apps/web/src/components/dashboard/members-list.tsx:31-40` — local re-implementation, same logic minus the email fallback, signature `initials(name)`.

Duplicate 3 — date-joined formatting:

- `apps/web/src/components/dashboard/members-list.tsx:42-49` — `formatJoined`: `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`, `null → '—'`.

Duplicate 4 — env-name rules, client copy of a server schema:

- `apps/web/src/components/dashboard/environments-manager.tsx:46-54`:

```ts
const ENV_NAME_RE = /^[a-z0-9_-]+$/

function validateEnvName(name: string): string | null {
  if (!name.trim()) return 'Name is required'
  if (name.length > 64) return 'Max 64 characters'
  if (!ENV_NAME_RE.test(name))
    return 'Only lowercase letters, numbers, hyphens and underscores'
  return null
}
```

- Server truth — `packages/api/src/lib/environment.ts:8-15`:

```ts
export const envNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, hyphens and underscores')
```

The web already runtime-imports from `@envy/api` paths (`audit-log.tsx:1` imports from `@envy/api/lib/audit-actions`), so importing `envNameSchema` is viable — but `environment.ts` also imports drizzle/TRPC modules at the top. Check bundle hygiene: if importing `envNameSchema` from `../lib/environment` drags server-only modules into the client bundle, move the schema to a leaf module first (step 4 handles this).

Test pattern to copy — `apps/web/src/utils/initials.test.ts`: plain `bun:test` beside the source file, no DOM, run via `cd apps/web && bun test`.

Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `bun run check-types` | exit 0 |
| Web tests | `cd apps/web && bun test` | all pass |
| Web dev (manual) | `bun run dev` | web on :3001 |

## Scope

**In scope**:
- `apps/web/src/utils/time.ts` + `time.test.ts` (create)
- `apps/web/src/components/dashboard/audit-log.tsx` (swap `timeAgo` import only)
- `apps/web/src/components/dashboard/secrets-stats.tsx` (swap `formatLastActivity`)
- `apps/web/src/components/dashboard/members-list.tsx` (use shared `initials`, shared date format)
- `apps/web/src/components/dashboard/environments-manager.tsx` (validate via server schema)
- `packages/api/src/lib/env-name.ts` (create, only if step 4's bundle check requires the move) + `packages/api/src/lib/environment.ts` (re-export only, same condition)

**Out of scope** (do NOT touch):
- Rendered output changes — every call site must render the exact same strings it does today (the two time styles both survive, as two named functions).
- `secret-add-dialog.tsx` key-sanitization regex — inline UX coupling, deliberately skipped.
- CLI `formatRelativeTime` (`packages/cli/src/core/`) — CLI/web don't share a utils package today; creating one is not worth it for one function. Deferred.
- `apps/web/src/utils/initials.ts` itself — it is already correct and tested.

## Git workflow

- Branch: `advisor/019-web-pure-helpers`
- Conventional commits, e.g. `refactor(web): consolidate time/initials/env-name helpers`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `utils/time.ts`

Move both implementations verbatim as named exports (behavior-preserving, including their different thresholds and locales):

```ts
export function timeAgoCompact(date: Date | string): string       // audit-log's timeAgo body
export function timeAgoVerbose(date: Date | string | undefined): string  // secrets-stats' formatLastActivity body
export function formatDateShort(date: Date | string | null | undefined): string  // members-list's formatJoined body
```

**Verify**: `bun run check-types` → exit 0.

### Step 2: Swap the three call sites

- `audit-log.tsx`: delete local `timeAgo`, import `timeAgoCompact`, rename usage (one render call site, line ~186).
- `secrets-stats.tsx`: delete local `formatLastActivity`, import `timeAgoVerbose`.
- `members-list.tsx`: delete local `formatJoined`, import `formatDateShort`; delete local `initials`, import `initials` from `@/utils/initials` and call as `initials(m.user?.name, null)` (the member payload carries no email — passing `null` preserves the current `'??'` fallback exactly).

**Verify**: `bun run check-types` → exit 0; `grep -rn "function timeAgo\|function formatLastActivity\|function formatJoined\|function initials" apps/web/src/components/dashboard/` → zero matches.

### Step 3: Test `utils/time.ts`

`apps/web/src/utils/time.test.ts`, modeled on `initials.test.ts`. Use fixed dates relative to a captured `Date.now()` (construct inputs as `new Date(Date.now() - 5 * 60_000)`), cases:

- `timeAgoCompact`: <1min → `'now'`; 5min → `'5m'`; 3h → `'3h'`; 2d → `'2d'`; >30d → matches `/^[A-Z][a-z]{2} \d{1,2}$/` (locale short-month form).
- `timeAgoVerbose`: `undefined` → `'—'`; <1min → `'Just now'`; 5min → `'5m ago'`; 8d → falls through to `toLocaleDateString()` output (assert non-empty, don't pin locale format).
- `formatDateShort`: `null`/`undefined` → `'—'`; a fixed date → its `en-US` short form.

**Verify**: `cd apps/web && bun test` → all pass (3 test files now).

### Step 4: Env-name validation from the server schema

1. Bundle check first: `grep -n "^import" packages/api/src/lib/environment.ts` — it imports `@envy/db` and `@trpc/server`. That makes direct client import unsafe (server modules in the browser bundle). So: create `packages/api/src/lib/env-name.ts` containing only the zod schema (move it verbatim), and re-export from `environment.ts` (`export { envNameSchema } from './env-name'`) so all server imports keep working.
2. In `environments-manager.tsx`, delete `ENV_NAME_RE` and rewrite `validateEnvName` on top of the schema, preserving today's messages:

```ts
import { envNameSchema } from '@envy/api/lib/env-name'

function validateEnvName(name: string): string | null {
  if (!name.trim()) return 'Name is required'
  if (name.length > 64) return 'Max 64 characters'
  if (!envNameSchema.safeParse(name).success)
    return 'Only lowercase letters, numbers, hyphens and underscores'
  return null
}
```

(The function shape and messages stay — only the rule source changes; when the server regex changes, the client follows automatically.)

**Verify**: `bun run check-types` → exit 0; `cd packages/api && bun test` → all pass (re-export preserved server behavior); `bun run dev` → environments manager still rejects `UPPER-case` names with the same message.

## Test plan

Covered in step 3 (new `time.test.ts` cases). Regression: `cd apps/web && bun test` and `cd packages/api && bun test` all green; manual spot-check that audit-log timestamps, "last activity" stat, member joined dates, and avatar initials render unchanged.

## Done criteria

- [ ] `grep -rn "function timeAgo\|function formatLastActivity\|function formatJoined\|function initials" apps/web/src/components/dashboard/` → zero matches
- [ ] `grep -rn "ENV_NAME_RE" apps/web/src` → zero matches
- [ ] `apps/web/src/utils/time.test.ts` exists; `cd apps/web && bun test` exits 0
- [ ] `cd packages/api && bun test` exits 0 (env-name re-export intact)
- [ ] `bun run check-types` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Importing `@envy/api/lib/env-name` from the web fails to resolve (check how `@envy/api/lib/audit-actions` resolves in `packages/api/package.json` `exports` — mirror that; if the exports map needs a new entry, add exactly one, matching the existing pattern; if there is no exports map and it works by direct path, fine).
- Any call site renders a *different* string after the swap (the moves must be verbatim; a behavior change means a copy diverged in a way this plan didn't record — report the diff).
- `audit-log.tsx` has drifted (Plans 014/016) such that `timeAgo` moved or changed — reconcile against the live file; if the function is gone entirely, skip its swap and note it.

## Maintenance notes

- Future duplicates of these helpers should fail review by pointing at `utils/time.ts` / `utils/initials.ts` — the pattern is now established with tests.
- Deferred: unifying with the CLI's `formatRelativeTime` would need a shared `@envy/utils` package — revisit only if a third consumer appears.
- Reviewers: confirm no import of `packages/api/src/lib/environment.ts` from web code (only `env-name.ts`) — the whole point of the leaf module is keeping drizzle/TRPC out of the browser bundle.
