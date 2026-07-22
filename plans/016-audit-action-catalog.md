# Plan 016: One audit-action catalog — values, verbs, and labels in a single module

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- packages/api/src/lib/audit-actions.ts apps/web/src/components/dashboard/audit-log.tsx`
> Exception: Plan 014 legitimately edits `audit-log.tsx` (pagination). If its
> status is DONE, re-read the live file; the action-set/`actionVerb` block this
> plan replaces will still be recognizable. On any other mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (Plan 017 depends on THIS plan)
- **Category**: tech-debt
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

The audit-action vocabulary is defined in three places that disagree. The server's canonical catalog (`audit-actions.ts`) has 7 actions; the web's `audit-log.tsx` re-declares local sets and a verb-mapping switch that include actions the server **never emits** (`pulled`, `member_invited`, `member_removed`, `secret_created`, singular `secret_updated`/`secrets_deleted` double-casing) — dead branches that mask real drift. When Plan 017 starts emitting member audit events, the vocabulary must live in exactly one module or the client and server will diverge again. This plan extends the catalog with verbs/labels, makes the web consume it, and deletes the divergent local copies.

## Current state

- `packages/api/src/lib/audit-actions.ts` (21 lines, complete file):

```ts
/** Pure audit action catalog — safe for web and server. */

export const AUDIT_ACTIONS = [
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted',
  'environment_created',
  'environment_renamed',
  'environment_deleted'
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const SECRET_AUDIT_ACTIONS = new Set<string>([
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted'
])
```

- `packages/api/src/lib/audit.ts` — `recordAudit` types its `action` field as `AuditAction`; re-exports the catalog. This is what makes extending `AUDIT_ACTIONS` the single gate for new actions.
- `apps/web/src/components/dashboard/audit-log.tsx:13-44` — the drift:

```ts
const SECRET_ACTIONS = SECRET_AUDIT_ACTIONS        // ok, imported

const MEMBER_ACTIONS = new Set(['member_invited', 'member_removed'])  // never emitted
const CLI_ACTIONS = new Set(['pushed', 'pulled', 'revealed'])          // 'pulled' never emitted

function actionVerb(action: string): { verb: string; color: string } {
  switch (action) {
    case 'pushed': return { verb: 'pushed', color: 'text-brand' }
    case 'pulled': return { verb: 'pulled', color: 'text-brand' }          // dead
    case 'revealed': return { verb: 'revealed', color: 'text-warning' }
    case 'secret_created': return { verb: 'added', color: 'text-brand' }   // dead
    case 'secret_updated':                                                  // dead
    case 'secrets_updated': return { verb: 'changed', color: 'text-info' }
    case 'secret_deleted':                                                  // dead
    case 'secrets_deleted': return { verb: 'deleted', color: 'text-danger' }
    case 'member_invited': return { verb: 'invited', color: 'text-info' }  // dead until 017
    case 'member_removed': return { verb: 'removed', color: 'text-danger' } // dead until 017
    default: return { verb: action.replace(/_/g, ' '), color: 'text-text-secondary' }
  }
}
```

(CLI `envy pull` calls `secrets.reveal`, which records `'revealed'` — `secrets-vault.ts:165`. `'pulled'` has never existed server-side.)

- The web already runtime-imports from this package path (`audit-log.tsx:1`: `import { SECRET_AUDIT_ACTIONS } from '@envy/api/lib/audit-actions'`) — so adding exports there is consumable without build changes.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

Target design — `audit-actions.ts` becomes the whole vocabulary:

```ts
export const AUDIT_ACTIONS = [
  'pushed',
  'revealed',
  'secrets_updated',
  'secrets_deleted',
  'environment_created',
  'environment_renamed',
  'environment_deleted',
  'member_invited',
  'member_removed'
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const SECRET_AUDIT_ACTIONS = new Set<string>([...])   // unchanged
export const MEMBER_AUDIT_ACTIONS = new Set<string>(['member_invited', 'member_removed'])
export const CLI_AUDIT_ACTIONS = new Set<string>(['pushed', 'revealed'])

/** UI-agnostic label map: verb + semantic tone. Web maps tone → CSS. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, { verb: string; tone: 'brand' | 'info' | 'warning' | 'danger' | 'muted' }> = {
  pushed: { verb: 'pushed', tone: 'brand' },
  revealed: { verb: 'revealed', tone: 'warning' },
  secrets_updated: { verb: 'changed', tone: 'info' },
  secrets_deleted: { verb: 'deleted', tone: 'danger' },
  environment_created: { verb: 'created env', tone: 'brand' },
  environment_renamed: { verb: 'renamed env', tone: 'info' },
  environment_deleted: { verb: 'deleted env', tone: 'danger' },
  member_invited: { verb: 'invited', tone: 'info' },
  member_removed: { verb: 'removed', tone: 'danger' }
}
```

Adding the two member actions **now** (even though nothing emits them until Plan 017) is intentional: the type union is what lets 017's `recordAudit` calls compile.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `bun run check-types` | exit 0 |
| API tests | `cd packages/api && bun test` | all pass (Postgres up: `bun run db:docker:up`) |
| Web dev (manual) | `bun run dev` | web on :3001 |

## Scope

**In scope**:
- `packages/api/src/lib/audit-actions.ts`
- `apps/web/src/components/dashboard/audit-log.tsx` (the sets + `actionVerb` block only — not the query/pagination logic)

**Out of scope** (do NOT touch):
- `packages/api/src/routers/members.ts` / emitting member events — that is Plan 017.
- `packages/api/src/lib/audit.ts` — re-exports keep working unchanged.
- `secrets-vault.ts` / `environment.ts` emitters — action strings unchanged.
- Any CLI code.

## Git workflow

- Branch: `advisor/016-audit-action-catalog`
- Conventional commits, e.g. `refactor(api): single audit-action catalog with verbs and tones`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend the catalog

Rewrite `audit-actions.ts` per the target design above (keep the existing header comment and `SECRET_AUDIT_ACTIONS` as-is; append the new actions, sets, and `AUDIT_ACTION_LABELS`).

**Verify**: `bun run check-types` → exit 0 (the widened `AuditAction` union is backward-compatible with every existing `recordAudit` call).

### Step 2: Web consumes the catalog

In `audit-log.tsx`:

1. Import: `import { AUDIT_ACTION_LABELS, CLI_AUDIT_ACTIONS, MEMBER_AUDIT_ACTIONS, SECRET_AUDIT_ACTIONS } from '@envy/api/lib/audit-actions'`.
2. Delete the local `MEMBER_ACTIONS` and `CLI_ACTIONS` declarations; point the filter logic at the imported sets (`SECRET_ACTIONS` alias can stay or be inlined).
3. Replace `actionVerb` with a thin lookup that maps tone → the exact CSS classes used today:

```ts
const TONE_CLASS: Record<string, string> = {
  brand: 'text-brand',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-text-secondary'
}

function actionVerb(action: string): { verb: string; color: string } {
  const label = AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS]
  if (label) return { verb: label.verb, color: TONE_CLASS[label.tone] }
  return { verb: action.replace(/_/g, ' '), color: 'text-text-secondary' }
}
```

Keep the unknown-action fallback — old audit rows may hold retired strings; rendering must never crash on them.

**Verify**: `bun run check-types` → exit 0; `grep -n "pulled\|secret_created\|secret_updated'" apps/web/src/components/dashboard/audit-log.tsx` → zero matches (dead vocabulary gone).

## Test plan

- `cd packages/api && bun test` → existing audit/vault/environment tests still pass (action strings unchanged).
- Add one test where audit coverage already lives (check for an existing test asserting `recordAudit` output — e.g. in `environments.test.ts` or `secrets` tests): assert `AUDIT_ACTION_LABELS` has an entry for every member of `AUDIT_ACTIONS` (`for (const a of AUDIT_ACTIONS) expect(AUDIT_ACTION_LABELS[a]).toBeDefined()`), so a future action can't be added without a label. Place it in a new `packages/api/src/lib/audit-actions.test.ts` (pure, no DB).
- Manual: `bun run dev` → audit page renders identical verbs/colors for existing entries.

## Done criteria

- [ ] `grep -rn "new Set(\['member_invited'" apps/web/src` → zero matches (no local action sets)
- [ ] `packages/api/src/lib/audit-actions.test.ts` exists and passes (label completeness)
- [ ] `bun run check-types` exits 0; `cd packages/api && bun test` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `@envy/api/lib/audit-actions` cannot be runtime-imported from the web for some new reason (it already is today at `audit-log.tsx:1` — if that import is gone, investigate why before re-adding).
- Widening `AuditAction` breaks a typecheck somewhere unexpected (an exhaustive switch over the union in code not listed here) — report the site instead of patching it ad hoc.

## Maintenance notes

- Plan 017 adds the emitters for `member_invited`/`member_removed` — this plan intentionally ships the vocabulary first (dead-but-typed for one plan cycle).
- Rule going forward (worth a line in a reviewer's head): a new audit action = one edit in `audit-actions.ts` (value + label). Anything that re-declares action strings elsewhere is a regression of this plan.
- Deferred: pruning historical rows with retired action strings — not worth it; the fallback renders them.
