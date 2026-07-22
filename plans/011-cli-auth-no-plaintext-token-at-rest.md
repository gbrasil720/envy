# Plan 011: Stop persisting the raw CLI API token in the database

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- packages/api/src/routers/cli-auth.ts packages/db/src/schema/envy.ts packages/api/src/routers/cli-auth.test.ts packages/db/src/migrations`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — changes the login handshake's internal handoff (external response shapes stay identical)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

During `envy login`, the browser-side `approve` mutation mints a full-privilege CLI bearer token and writes it **in plaintext** to `cli_auth_session.raw_key`, where it sits until the CLI's `poll` claims and deletes the row. Two problems: (1) a usable credential is at rest in Postgres — any backup, replica, or query-log capture yields working tokens; (2) the cleanup in `start` only deletes rows with `status = 'pending'`, so an `authorized` session whose CLI never polls (user closed the terminal) keeps its plaintext token in the DB **forever**, alongside a live, non-revoked `api_key` row. The fix: generate the token at `poll` time instead, so a raw token never touches the database, and make the sweep status-agnostic.

## Current state

- `packages/api/src/routers/cli-auth.ts` — the CLI login handshake router. Flow today:
  1. `start` (public): deletes expired **pending** sessions, inserts a new session with `sessionToken` (CLI polls with it) + `browserToken` (goes in the browser URL), 5-min expiry (`POLLING_EXPIRY_MS`, line 9).
  2. `approve` (protected, lines 101–147): finds session by `browserToken`, generates the token, inserts the `apiKey` row, then stores the raw token on the session:

```ts
// cli-auth.ts:123-142
const rawToken = generateApiToken()
const keyHash = await hashToken(rawToken)
const keyPrefix = tokenPrefix(rawToken)
const keyId = crypto.randomUUID()

await ctx.db.insert(apiKey).values({
  id: keyId,
  userId: ctx.session.user.id,
  name: 'CLI',
  keyHash,
  keyPrefix
})

await ctx.db
  .update(cliAuthSession)
  .set({
    status: 'authorized',
    rawKey: rawToken
  })
  .where(eq(cliAuthSession.browserToken, input.token))
```

  3. `poll` (public, lines 42–100): on `status === 'authorized'`, requires `session.rawKey`, deletes the session, returns `{ status: 'authorized', api_key: session.rawKey }`.
  4. The `start` cleanup (lines 13–21) filters `eq(cliAuthSession.status, 'pending')`.

- `packages/db/src/schema/envy.ts:148-168` — `cliAuthSession` table: has `rawKey: text('raw_key')` (line 158), **no `userId` column**. `apiKey` table (lines 107–125) stores only `keyHash` (SHA-256) — the deliberate pattern this plan extends to the handshake.
- CLI consumer: `packages/cli/src/core/` polls `cliAuth.poll` and reads `api_key` from the response. **The response shape must not change** — the CLI is published separately.
- Existing tests: `packages/api/src/routers/cli-auth.test.ts` covers the handshake through `createCaller` against real Postgres (pattern: `packages/api/src/routers/environments.test.ts`, harness in `packages/api/src/test/{db,factories,caller}.ts`).
- Crypto helpers: `generateApiToken`, `hashToken`, `tokenPrefix` from `@envy/crypto`.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

Target design (what will be true after):

- `approve` only marks the session: `status: 'authorized'`, `userId: ctx.session.user.id`. No token is generated, nothing raw is stored.
- `poll`, on an authorized session, atomically claims the session (delete-returning), then generates the token, inserts the `apiKey` row for the stored `userId`, and returns the raw token in the response — the only place it ever exists is that response body.
- `raw_key` column is dropped; `user_id` column is added (nullable, FK to `user.id`, `onDelete: 'cascade'`).
- `start`'s sweep deletes **all** expired sessions regardless of status.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Postgres up | `bun run db:docker:up` | container healthy |
| Generate migration | `bun run db:generate` | new SQL file in `packages/db/src/migrations/` |
| Apply schema (dev) | `bun run db:push` | exit 0 |
| API tests | `cd packages/api && bun test routers/cli-auth` | all pass |
| Full tests | `bun run test` | all pass |
| Typecheck | `bun run check-types` | exit 0 |

See `TESTING.md` for the Postgres env expected by the API integration suite.

## Scope

**In scope** (the only files you may modify):
- `packages/db/src/schema/envy.ts` (the `cliAuthSession` table only)
- `packages/db/src/migrations/` (generated migration)
- `packages/api/src/routers/cli-auth.ts`
- `packages/api/src/routers/cli-auth.test.ts`

**Out of scope** (do NOT touch):
- `packages/cli/**` — the poll/approve response shapes are unchanged; the CLI needs no edits. If you find yourself editing the CLI, the design has been violated.
- `packages/api/src/context.ts`, `apiKey` schema — token validation and key storage are untouched here (expiry is Plan 012).
- `apps/web/src/routes/cli-auth*` — the browser approval page calls `approve`/`getSession`/`cancel`, whose shapes don't change.

## Git workflow

- Branch: `advisor/011-cli-auth-no-plaintext-at-rest`
- Conventional commits, e.g. `fix(api): stop persisting raw CLI token in cli_auth_session`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema — add `userId`, drop `rawKey`

In `packages/db/src/schema/envy.ts`, `cliAuthSession` table: remove `rawKey: text('raw_key')`; add:

```ts
userId: text('user_id').references(() => user.id, { onDelete: 'cascade' })
```

(`user` is already imported in this file for other tables — verify, and import from the auth schema module if not.)

**Verify**: `bun run db:generate` → migration created containing `ALTER TABLE "cli_auth_session" DROP COLUMN "raw_key"` and `ADD COLUMN "user_id"`. Then `bun run db:push` against the docker DB → exit 0.

### Step 2: `approve` stops minting the token

In `cli-auth.ts`, `approve`: delete the `generateApiToken`/`hashToken`/`tokenPrefix`/`apiKey`-insert block (current lines 123–134). The update becomes:

```ts
await ctx.db
  .update(cliAuthSession)
  .set({ status: 'authorized', userId: ctx.session.user.id })
  .where(eq(cliAuthSession.browserToken, input.token))
```

Return shape stays `{ success: true }`. Remove now-unused imports if any (`generateApiToken` etc. move to `poll` — see step 3, so likely all still used; let Biome's organize-imports settle it).

**Verify**: `bun run check-types` → exit 0 (poll still references `rawKey` until step 3 — if typecheck fails only on `rawKey` in `poll`, proceed to step 3 first, then verify both together).

### Step 3: `poll` claims atomically and mints the token

Replace the `status === 'authorized'` branch of `poll`. Claim the session with a conditional delete-returning so two concurrent polls can't both mint a key:

```ts
if (session.status === 'authorized') {
  const [claimed] = await ctx.db
    .delete(cliAuthSession)
    .where(
      and(
        eq(cliAuthSession.sessionToken, input.token),
        eq(cliAuthSession.status, 'authorized')
      )
    )
    .returning({ userId: cliAuthSession.userId })

  if (!claimed?.userId) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Session authorized but claim failed'
    })
  }

  const rawToken = generateApiToken()
  await ctx.db.insert(apiKey).values({
    id: crypto.randomUUID(),
    userId: claimed.userId,
    name: 'CLI',
    keyHash: await hashToken(rawToken),
    keyPrefix: tokenPrefix(rawToken)
  })

  return { status: 'authorized' as const, api_key: rawToken }
}
```

Also remove the two `rawKey: null` writes in `poll`'s expiry branch and `cancel` (the column no longer exists).

**Verify**: `bun run check-types` → exit 0; `grep -n "rawKey" packages/api/src/routers/cli-auth.ts` → zero matches.

### Step 4: status-agnostic expiry sweep

In `start`, drop the status filter so expired sessions of any status are purged:

```ts
await ctx.db
  .delete(cliAuthSession)
  .where(lt(cliAuthSession.expiresAt, new Date()))
```

Remove the now-unused `and` import if nothing else uses it in this file (step 3 added an `and` — check before removing).

**Verify**: `grep -n "status, 'pending'" packages/api/src/routers/cli-auth.ts` → no match inside the `start` cleanup.

### Step 5: Update tests

Update `packages/api/src/routers/cli-auth.test.ts` to the new flow and add coverage (see Test plan).

**Verify**: `cd packages/api && bun test routers/cli-auth` → all pass.

## Test plan

In `packages/api/src/routers/cli-auth.test.ts`, model on the existing tests in that file (real-Postgres via `createCaller`, `truncateAll` per test):

1. Happy path: `start` → `approve` (as a signed-in user) → `poll` returns `status: 'authorized'` with an `api_key` string; an `apiKey` row exists for that user with `keyHash === hashToken(returned token)`; the `cliAuthSession` row is gone.
2. **Regression (the point of this plan)**: after `approve` and before `poll`, read the `cliAuthSession` row directly and assert it contains no column holding the raw token (the schema no longer has one) and that **no `apiKey` row exists yet** for the user.
3. Second `poll` after a successful claim → `NOT_FOUND` (session deleted); exactly one `apiKey` row exists (no double-mint).
4. Expiry sweep: insert an `authorized` session with `expiresAt` in the past (direct DB insert with a `userId`), call `start`, assert the stale row was deleted.
5. Keep/adapt all existing passing cases (pending poll, cancel, expired poll).

**Verification**: `cd packages/api && bun test routers/cli-auth` → all pass, including the new cases. Then `bun run test` (full suite, Postgres running) → all pass.

## Done criteria

- [ ] `grep -rn "raw_key\|rawKey" packages/db/src packages/api/src` → zero matches
- [ ] Migration file exists dropping `raw_key` and adding `user_id`
- [ ] `bun run check-types` exits 0
- [ ] `cd packages/api && bun test` exits 0, including the new regression tests
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The CLI (`packages/cli`) turns out to read anything from the handshake beyond `poll`'s `{ status, api_key }` and `start`'s `{ session_token, url, expires_at }` — response-shape change would break published CLIs.
- Drizzle's `delete().returning()` is unavailable or behaves differently against the test DB — the atomic claim is load-bearing; do not fall back to select-then-delete without flagging it.
- `cli-auth.test.ts` does not exist or tests a materially different flow than described.
- Any production data migration concern surfaces (existing `raw_key` values in a live DB are burned tokens — note in your report that operators should consider revoking `api_key` rows created before this change whose sessions were never claimed).

## Maintenance notes

- Plan 012 (API key expiry) touches `poll`'s `apiKey` insert — land this first; 012 adds `expiresAt` to that insert.
- Reviewers: scrutinize the claim-then-mint ordering in `poll` — the delete-returning must be the concurrency gate; minting before deleting reintroduces double-mint.
- Deferred: rate limiting on the public `cliAuth.start`/`poll` procedures (audit finding SECURITY-04) — separate concern.
