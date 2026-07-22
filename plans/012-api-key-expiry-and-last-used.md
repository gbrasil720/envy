# Plan 012: Give CLI API keys an expiry and record last use

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- packages/api/src/context.ts packages/db/src/schema/envy.ts packages/api/src/routers/cli-auth.ts packages/db/src/migrations`
> Note: plan 011 intentionally modifies `cli-auth.ts` and the schema before
> this plan runs — that drift is expected; verify 011's status is DONE in
> `plans/README.md` and read the live `cli-auth.ts` before starting. On any
> other mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — expired keys will force users to `envy login` again; validation-path change
- **Depends on**: plans/011-cli-auth-no-plaintext-token-at-rest.md
- **Category**: security
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

CLI bearer tokens live in `~/.envy/credentials.json` on developer machines and are accepted forever: the `api_key` table has no expiry column, the tRPC context checks only `revokedAt`, and `lastUsedAt` exists in the schema but is never written. A leaked token is valid until the user manually runs `envy logout`, and there is no usage signal to detect abuse. This plan adds a 90-day expiry enforced at validation time and writes `lastUsedAt` (throttled) so stale keys become visible and bounded.

## Current state

- `packages/db/src/schema/envy.ts:107-125` — `apiKey` table:

```ts
export const apiKey = pgTable(
  'api_key',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').default('CLI').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    lastUsedAt: timestamp('last_used_at'),   // exists, never written
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  ...
)
```

No `expiresAt` column.

- `packages/api/src/context.ts:37-58` — Bearer validation:

```ts
const bearerMatch = authHeader?.match(/^Bearer\s+([A-Za-z0-9_\-.]+)$/)
if (bearerMatch) {
  const token = bearerMatch[1]
  if (token) {
    const key = await db.query.apiKey.findFirst({
      where: eq(apiKey.keyHash, await hashToken(token)),
      columns: { id: true, userId: true, revokedAt: true }
    })

    if (key && !key.revokedAt) {
      return { db, authHeader, cookieHeader, apiKeyId: key.id, session: { user: { id: key.userId } } }
    }
  }
}
```

An expired-or-invalid Bearer falls through to cookie resolution and ends as `session: null`, which protected procedures turn into `UNAUTHORIZED` — the CLI already maps `UNAUTHORIZED` to a "run `envy login`" message (see `packages/cli/src/core/` error handling; verify, don't modify).

- After plan 011, the only place `apiKey` rows are created is `cliAuth.poll` in `packages/api/src/routers/cli-auth.ts` (the mint block inserts `id`, `userId`, `name`, `keyHash`, `keyPrefix`).
- Test harness: `packages/api/src/test/{db,factories,caller}.ts`; context tests, if any, live near `packages/api/src`. `cli-auth.test.ts` covers the mint path.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Postgres up | `bun run db:docker:up` | container healthy |
| Generate migration | `bun run db:generate` | new SQL file in `packages/db/src/migrations/` |
| Apply schema (dev) | `bun run db:push` | exit 0 |
| API tests | `cd packages/api && bun test` | all pass |
| Typecheck | `bun run check-types` | exit 0 |

## Scope

**In scope**:
- `packages/db/src/schema/envy.ts` (the `apiKey` table only)
- `packages/db/src/migrations/` (generated migration)
- `packages/api/src/context.ts`
- `packages/api/src/routers/cli-auth.ts` (only the `apiKey` insert in `poll`)
- Tests: `packages/api/src/routers/cli-auth.test.ts`, plus a new `packages/api/src/context.test.ts` if none exists

**Out of scope** (do NOT touch):
- `packages/cli/**` — expired keys surface as the existing `UNAUTHORIZED` → re-login flow; no CLI change.
- Any token-rotation UI/router (list/revoke keys) — future work, not this plan.
- `packages/auth/**` — cookie sessions are unrelated.

## Git workflow

- Branch: `advisor/012-api-key-expiry`
- Conventional commits, e.g. `feat(api): expire CLI keys after 90 days, record last use`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema — add `expiresAt`

Add to the `apiKey` table:

```ts
expiresAt: timestamp('expires_at')
```

Nullable on purpose: existing rows have no expiry (treated as legacy; see step 3) and the migration stays a pure `ADD COLUMN`.

**Verify**: `bun run db:generate` → migration with `ADD COLUMN "expires_at"`; `bun run db:push` → exit 0.

### Step 2: Mint with expiry

In `cli-auth.ts` `poll`'s mint block, add a 90-day expiry. Define the constant next to `POLLING_EXPIRY_MS`:

```ts
const API_KEY_TTL_MS = 1000 * 60 * 60 * 24 * 90 // 90 days
```

and in the insert: `expiresAt: new Date(Date.now() + API_KEY_TTL_MS)`.

**Verify**: `bun run check-types` → exit 0.

### Step 3: Enforce expiry + write `lastUsedAt` in the context

In `context.ts`, extend the lookup columns with `expiresAt: true, lastUsedAt: true` and change the acceptance check to:

```ts
const now = new Date()
if (key && !key.revokedAt && (!key.expiresAt || key.expiresAt > now)) {
```

`!key.expiresAt` keeps pre-migration legacy keys working — do not lock users out retroactively.

Inside the accepted branch, before returning, record use throttled to once per hour so hot CLI loops don't write on every request:

```ts
if (!key.lastUsedAt || now.getTime() - key.lastUsedAt.getTime() > 60 * 60 * 1000) {
  await db
    .update(apiKey)
    .set({ lastUsedAt: now })
    .where(eq(apiKey.id, key.id))
}
```

(Keep it awaited — a fire-and-forget promise can outlive the request in serverless contexts.)

**Verify**: `bun run check-types` → exit 0.

## Test plan

Model on existing API tests (`packages/api/src/routers/environments.test.ts` structure; real Postgres, `truncateAll`).

In `cli-auth.test.ts`:
1. Minted key has `expiresAt` ≈ 90 days out (assert within a minute of `Date.now() + 90d`).

In a context test (create `packages/api/src/context.test.ts` if absent — construct `createTRPCContext` directly with a `Headers` carrying `Authorization: Bearer <raw>` and the test db; a resolver stub `resolveCookieSession: async () => null`):
2. Valid unexpired key → context has `session.user.id` and `apiKeyId`.
3. Key with `expiresAt` in the past (direct DB update) → `session: null`.
4. Key with `expiresAt: null` (legacy) → accepted.
5. `lastUsedAt` written on first use; a second immediate call does **not** bump it (throttle), and a call after setting `lastUsedAt` two hours in the past does.

**Verification**: `cd packages/api && bun test` → all pass including new cases.

## Done criteria

- [ ] Migration adds `expires_at` to `api_key`
- [ ] `grep -n "expiresAt" packages/api/src/context.ts` shows the enforcement check
- [ ] New context tests cover expired / legacy-null / throttled-lastUsedAt cases and pass
- [ ] `bun run check-types` exits 0; `cd packages/api && bun test` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 011 is not DONE (the mint block this plan edits won't exist in `poll`).
- `createTRPCContext`'s signature differs from the excerpt (drift) — re-read before improvising a test harness.
- The CLI's `UNAUTHORIZED` handling turns out not to prompt re-login (check `packages/cli/src/core/` error mapping read-only) — expiry would strand users silently; report instead of shipping.

## Maintenance notes

- Future "Access tokens" UI (list/revoke/rotate — see audit DIRECTION-02) should read `lastUsedAt`/`expiresAt` added here.
- Reviewers: confirm the legacy `expiresAt IS NULL` acceptance is intentional and temporary; consider a follow-up backfill setting expiry on old keys after users have had a re-login window.
- The hourly `lastUsedAt` throttle adds one UPDATE per key-hour — negligible; revisit only if context latency shows in traces.
