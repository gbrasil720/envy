# Plan 013: List secret keys without decrypting — reveal (and audit) only on demand

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- packages/api/src/lib/secrets-vault.ts packages/api/src/routers/secrets.ts apps/web/src/components/dashboard/secrets-table.tsx packages/api/src/routers/secrets.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — touches the secrets table's data flow and audit semantics
- **Depends on**: none (015 touches the same component — coordinate; see Maintenance notes)
- **Category**: security | perf
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

Opening the dashboard secrets page fires `secrets.reveal`, which decrypts **every** secret in the environment server-side, ships all plaintext to the browser, and writes a `revealed` audit entry — even though the UI renders masked values by default. Three costs: plaintext crosses the wire on every page view for no reason; decryption CPU and payload scale with secret count; and the audit log fills with `revealed` events that were page loads, not reveals — corrupting the product's core trust claim ("every reveal is logged"). The fix is a keys-metadata endpoint for the default view, with `reveal` (and its audit entry) fired only when the user actually asks to see or copy values.

## Current state

- `packages/api/src/lib/secrets-vault.ts:128-192` — `revealSecrets(db, userId, { projectId, environment })`: resolves master key via `getProjectMasterKey` (access check inside), finds the environment, loads all secret rows, records audit `action: 'revealed'` with `metadata: { count }`, then decrypts everything (`Promise.all` over `decrypt`) and returns `{ secrets: Record<string, string> }`.
- `packages/api/src/routers/secrets.ts` — thin router; procedures `push`, `reveal`, `diff`, `update`, `delete`, each delegating to the vault. There is **no list/keys procedure**. Input validation uses the local `envName` zod schema (lines 11–15).
- `apps/web/src/components/dashboard/secrets-table.tsx` — the dashboard table (default component of the secrets page):

```ts
// secrets-table.tsx:79-81
const secretsQuery = useQuery(
  trpc.secrets.reveal.queryOptions({ projectId, environment: currentEnv })
)
```

  - `maskValue` (line 27) masks client-side; `revealed`/`revealAll` state (lines 43–44) toggles visibility of values it already has.
  - Rows render from `secretsQuery.data?.secrets` entries (line 117–118); per-row copy uses the plaintext value; `handleEnvChange` (line 147) resets reveal state on env switch.
  - The delete mutation invalidates `trpc.secrets.reveal…` (lines 95–115).
- Existing tests: `packages/api/src/routers/secrets.test.ts` and/or vault coverage in `packages/api/src/lib/secrets-vault.test.ts` — real-Postgres harness (`packages/api/src/test/{db,factories,caller}.ts`); model new tests on `packages/api/src/routers/environments.test.ts`.
- Audit helper: `recordAudit` in `packages/api/src/lib/audit.ts`; canonical actions in `packages/api/src/lib/audit-actions.ts` (`'revealed'` is canonical — semantics change, not the string).
- The CLI (`packages/cli`) calls `secrets.reveal` for `envy pull` — **must keep working unchanged**.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

Target design:

- New vault function `listSecretKeys(db, userId, { projectId, environment })` → `{ keys: { key: string; updatedAt: string }[] }`. Access-checked the same way (`getProjectMasterKey` is overkill — it decrypts the master key; use the same access-check helper the vault uses, see its imports, e.g. `requireProjectAccess` from `../lib/org-utils`), loads only `key` + `updatedAt` columns, **no decrypt, no audit**.
- New router procedure `secrets.list` (query) exposing it.
- The table renders rows from `secrets.list`. Values are fetched via the existing `secrets.reveal` query **enabled only when the user first reveals or copies** (`enabled` flag). Once fetched, masking/unmasking individual keys stays client-side (one audit entry per deliberate reveal session — same granularity the server records today, but now only when values were actually exposed).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Postgres up | `bun run db:docker:up` | container healthy |
| API tests | `cd packages/api && bun test` | all pass |
| Typecheck | `bun run check-types` | exit 0 |
| Web dev (manual check) | `bun run dev` | web on :3001, server on :3000 |

## Suggested executor toolkit

- If the `vercel-react-best-practices` skill is available, apply it when wiring the conditional `useQuery` (`enabled`) in step 3.

## Scope

**In scope**:
- `packages/api/src/lib/secrets-vault.ts` (add `listSecretKeys`; do not modify `revealSecrets`)
- `packages/api/src/routers/secrets.ts` (add `list` procedure)
- `apps/web/src/components/dashboard/secrets-table.tsx`
- `packages/api/src/routers/secrets.test.ts` (or the vault test file — wherever reveal is covered today)

**Out of scope** (do NOT touch):
- `packages/cli/**` — `envy pull` keeps calling `reveal`; a CLI `pull` genuinely is a reveal and should stay audited.
- `revealSecrets` semantics — it still records audit on every call; the change is that the web only calls it on user intent.
- `apps/web/src/components/dashboard/secrets-stats.tsx`, `secret-add-dialog.tsx`, `secret-edit-dialog.tsx` — their queries/mutations are Plan 015's territory. Exception: if `secret-edit-dialog` receives the current value as a prop from the table, pass the value from the reveal query's data and keep the prop shape (verify before editing anything).

## Git workflow

- Branch: `advisor/013-secrets-list-keys`
- Conventional commits, e.g. `feat(api): add secrets.list keys endpoint, reveal on demand in dashboard`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Vault — `listSecretKeys`

In `secrets-vault.ts`, add (near `revealSecrets`):

```ts
export async function listSecretKeys(
  db: Db,
  userId: string,
  input: { projectId: string; environment: string }
): Promise<{ keys: { key: string; updatedAt: Date }[] }> {
  // same access gate the other vault reads use — mirror revealSecrets'
  // pattern but WITHOUT loading/decrypting the master key:
  await requireProjectAccess(db, input.projectId, userId)

  const environmentId = await findEnvironmentId(db, input.projectId, input.environment)
  if (!environmentId) return { keys: [] }

  const rows = await db.query.secret.findMany({
    where: and(eq(secret.projectId, input.projectId), eq(secret.environmentId, environmentId)),
    columns: { key: true, updatedAt: true },
    orderBy: (s, { asc }) => [asc(s.key)]
  })

  return { keys: rows }
}
```

Adjust to the file's actual imports/helpers: check how `revealSecrets` gates access (`getProjectMasterKey` internally calls the access check — import and call the same underlying check directly; read `getProjectMasterKey` at `secrets-vault.ts:17-51` to find it). If the `secret` table has no `updatedAt` column (check `packages/db/src/schema/envy.ts`), return `createdAt` instead and mirror that in the router/UI. **No `recordAudit` call in this function.**

**Verify**: `bun run check-types` → exit 0.

### Step 2: Router — `secrets.list`

In `routers/secrets.ts`:

```ts
list: protectedProcedure
  .input(z.object({ projectId: z.string(), environment: envName }))
  .query(async ({ ctx, input }) => listSecretKeys(ctx.db, ctx.session.user.id, input)),
```

**Verify**: `bun run check-types` → exit 0.

### Step 3: Table — render from keys, reveal on intent

In `secrets-table.tsx`:

1. Add `const keysQuery = useQuery(trpc.secrets.list.queryOptions({ projectId, environment: currentEnv }))` and derive rows from `keysQuery.data?.keys` (list of `{ key }`).
2. Add reveal-intent state: `const [valuesRequested, setValuesRequested] = useState(false)`; reset it in `handleEnvChange` alongside the other resets.
3. Gate the existing reveal query: `useQuery({ ...trpc.secrets.reveal.queryOptions({ projectId, environment: currentEnv }), enabled: valuesRequested })`.
4. Any action needing a value — `toggleReveal`, reveal-all, per-row copy, bulk export, opening the edit dialog — first sets `valuesRequested(true)`; values render as a masked placeholder (e.g. `••••••••`) until `secretsQuery.data` arrives, then the existing `maskValue`/`isRevealed` logic applies unchanged.
5. Row count / empty state / search filter operate on `keysQuery` keys, not on the values map. Delete-mutation invalidation adds `trpc.secrets.list…` invalidation next to the existing `reveal` one.

Keep the component's props (`projectId`, `environments`, `projectPlan` …) unchanged.

**Verify**: `bun run check-types` → exit 0. Manual: `bun run dev`, open a project's secrets page → network tab shows `secrets.list` but **no** `secrets.reveal` call; click the eye/copy on one row → one `secrets.reveal` fires; audit log gains exactly one `revealed` entry for that action and none for the page load.

## Test plan

In the API test file covering secrets (model on `environments.test.ts`):

1. `secrets.list` returns the pushed keys sorted, without values, for a member of the org.
2. `secrets.list` for a non-member → authorization error (mirror how existing reveal tests assert access denial).
3. `secrets.list` on a nonexistent environment → `{ keys: [] }`.
4. **Regression (the point)**: after `secrets.list`, the `audit_log` table contains **no** `revealed` row (query the table directly like `environments.test.ts` does with `auditLog`); after `secrets.reveal`, it does.

**Verification**: `cd packages/api && bun test` → all pass including the 4 new cases.

## Done criteria

- [ ] `grep -n "recordAudit" packages/api/src/lib/secrets-vault.ts` shows no call inside `listSecretKeys`
- [ ] `grep -n "secrets.reveal.queryOptions" apps/web/src/components/dashboard/secrets-table.tsx` shows the query gated by an `enabled:` flag
- [ ] New API tests (list happy path, access denial, empty env, no-audit regression) pass
- [ ] `bun run check-types` exits 0; `cd packages/api && bun test` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `secrets-table.tsx` no longer matches the excerpts (Plan 015 may have landed first and restructured the mutation blocks) — re-read and reconcile; if the data-source lines (79–84) moved but are recognizable, proceed; if the component was split into files, STOP.
- The `secret` schema lacks both `updatedAt` and `createdAt` columns.
- The edit dialog turns out to fetch its own value rather than receiving it via prop, and gating reveal breaks it in a way not covered by step 3.4.
- The vault's access-check helper cannot be called without loading the master key (i.e. access logic is inseparable from decryption) — that would need a small vault refactor first; report it.

## Maintenance notes

- Plan 015 (shared mutation/invalidation helper) edits the same component's mutation blocks — run 013 and 015 sequentially, either order, but not concurrently.
- Future: a per-key `secrets.revealOne` would tighten audit granularity further (log *which* key was revealed); deferred — current metadata only records counts.
- Reviewers: confirm no code path renders values from `keysQuery` (keys only), and that copy always resolves through the gated reveal query.
