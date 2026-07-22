# Plan 017: Extract a members service module and record member audit events

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- packages/api/src/routers/members.ts packages/api/src/lib`
> Exception: Plan 016 legitimately edits `packages/api/src/lib/audit-actions.ts`
> — its DONE status is a **prerequisite**. On any other in-scope mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW-MED — pure code movement plus new audit writes; behavior of procedures unchanged
- **Depends on**: plans/016-audit-action-catalog.md
- **Category**: tech-debt
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

Half the API delegates to deep lib modules (`secrets.ts` router is 72 lines, all logic in `lib/secrets-vault.ts`), but `members.ts` is 328 lines with everything inline: seat-limit math, invite dedup, the whole accept flow, expiry handling. Two costs: the domain has two architectures (new code doesn't know which to copy), and member actions record **no audit events** — while the web's audit UI already ships verbs for `member_invited`/`member_removed` (dead code until the server emits them). This plan moves the logic into `lib/members-service.ts` mirroring the secrets-vault seam, and records the two member audit events, closing the loop with Plan 016's catalog.

## Current state

- `packages/api/src/routers/members.ts` — six procedures, all inline:
  - `list` (17–42): `requireProjectAccess` → member rows with user relation → `effectiveRole` mapping.
  - `pending` (44–69): admin access → pending invitations.
  - `invite` (71–147): admin access → `assertOrgWritable(organizationId)` → `getOrgSeatLimit` → count members + pending invites → seat check → dedup pending invite by email → insert `invitation` (48h expiry) → `// TODO: send invitation email via Resend` (line 143) → returns `{ id, email }`.
  - `accept` (149–261): find pending invite → expire-on-read if past `expiresAt` → email match against session user (case-insensitive) → already-member conflict check → `assertOrgWritable` → seat check → role clamp (`admin|member`, comment at 232–233: ownership never granted via invite) → insert `member` → mark invite accepted → resolve first project of the org for navigation, returns `{ projectId }`.
  - `remove` (263–299): admin access → resolve member row (Better Auth needs memberId) → `safeRemoveMember(ctx, organizationId, target.id)`.
  - `cancelInvite` (301–327): find invite → `requireMembership(…, 'admin')` (deliberately no `assertOrgWritable` — comment at 318: recovery path when over seat limit) → mark cancelled.
- Imports it depends on: `assertOrgWritable`, `getOrgSeatLimit`, `requireMembership`, `requireProjectAccess`, `safeRemoveMember` from `../lib/org-utils`; `effectiveRole` from `@envy/db/services`; schema tables `invitation`, `member` (organization schema), `user` (auth schema).
- The exemplar seam to mirror — `packages/api/src/routers/secrets.ts`:

```ts
// secrets.ts:26-28 — the whole procedure body
.mutation(async ({ ctx, input }) =>
  pushSecrets(ctx.db, ctx.session.user.id, input)
)
```

with `lib/secrets-vault.ts` exporting `pushSecrets(db, userId, input)` etc. Note: vault functions take `(db, userId, input)` — but `remove` needs `safeRemoveMember(ctx, …)` which takes the whole ctx. For the members service, pass `ctx` (type `Context` from `../context`) as first arg to every function for uniformity within this module: `inviteMember(ctx, input)`, etc. Document the deviation in one line at the top of the new file.
- Audit plumbing (after Plan 016): `recordAudit(db, { projectId, userId, action, targetKey?, metadata? })` from `../lib/audit`; `AuditAction` union includes `member_invited`, `member_removed`. `auditLog.projectId` is NOT NULL — member events must attach to a project; `invite`/`remove` receive `projectId` in their input, so they can record directly. `accept`/`cancelInvite` do not — they stay un-audited in this plan (see Maintenance notes).
- Existing tests: `packages/api/src/routers/members.test.ts` (real Postgres via `createCaller`; harness `packages/api/src/test/{db,factories,caller}.ts`). They test through the router — they must keep passing **unchanged**, which is the proof the extraction preserved behavior.
- Style: Biome — 2-space indent, single quotes, no semicolons, no trailing commas. Conventional commits.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Postgres up | `bun run db:docker:up` | container healthy |
| Members tests | `cd packages/api && bun test routers/members` | all pass |
| Full API tests | `cd packages/api && bun test` | all pass |
| Typecheck | `bun run check-types` | exit 0 |

## Scope

**In scope**:
- `packages/api/src/lib/members-service.ts` (create)
- `packages/api/src/routers/members.ts` (becomes thin delegation)
- `packages/api/src/routers/members.test.ts` (add audit assertions only; existing cases unchanged)

**Out of scope** (do NOT touch):
- Sending the invitation email — keep the `TODO` comment verbatim in the service (it is tracked as a direction finding; adding Resend here is scope creep).
- `packages/api/src/lib/org-utils.ts`, `packages/db/src/services.ts` — the org/billing consolidation is a separate candidate; call the existing helpers as-is, including the redundant reads.
- `apps/web/**` — the web's audit UI already renders member verbs (via Plan 016); no web change needed.
- Procedure input/output shapes — must stay byte-identical.

## Git workflow

- Branch: `advisor/017-members-service`
- Conventional commits, e.g. `refactor(api): extract members service, record member audit events`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `lib/members-service.ts` — pure movement

Create the module with six exported functions, each the **verbatim body** of its procedure (only mechanical changes: `ctx.db` stays as `ctx.db`, `ctx.session.user.id` becomes a local `const userId` at the top):

```ts
import type { Context } from '../context'

// Members domain service. Unlike secrets-vault (db, userId, input), these take
// ctx: remove() needs the full ctx for Better Auth's safeRemoveMember.

export async function listMembers(ctx: NonNullable<Context> & { session: { user: { id: string } } }, input: { projectId: string }) { … }
export async function listPendingInvites(ctx: …, input: { projectId: string }) { … }
export async function inviteMember(ctx: …, input: { projectId: string; email: string; role: 'admin' | 'member' }) { … }
export async function acceptInvite(ctx: …, input: { invitationId: string }) { … }
export async function removeMember(ctx: …, input: { projectId: string; userId: string }) { … }
export async function cancelInvite(ctx: …, input: { invitationId: string }) { … }
```

For the ctx parameter type, check how `safeRemoveMember` in `org-utils.ts` types its `ctx` argument and reuse that exact type — do not invent a new one. Move ALL imports the bodies need (`TRPCError`, schema tables, org-utils helpers, `effectiveRole`). Preserve every comment, including the `TODO: send invitation email via Resend` block and the role-clamp comment.

**Verify**: `bun run check-types` → exit 0.

### Step 2: Thin the router

`members.ts` keeps only zod input schemas and one-line delegation per procedure, mirroring `secrets.ts`:

```ts
invite: protectedProcedure
  .input(z.object({ projectId: z.string(), email: z.string().email(), role: z.enum(['admin', 'member']) }))
  .mutation(async ({ ctx, input }) => inviteMember(ctx, input)),
```

Delete the now-unused imports from the router.

**Verify**: `cd packages/api && bun test routers/members` → **all existing tests pass with zero test edits**. This is the extraction gate — if a test fails, the movement changed behavior; fix the movement, not the test. `wc -l packages/api/src/routers/members.ts` → under ~90 lines.

### Step 3: Record audit events

In `members-service.ts` (import `recordAudit` from `./audit`):

1. `inviteMember` — after the `invitation` insert, before the return:

```ts
await recordAudit(ctx.db, {
  projectId: input.projectId,
  userId,
  action: 'member_invited',
  targetKey: input.email,
  metadata: { role: input.role }
})
```

2. `removeMember` — after `safeRemoveMember` succeeds:

```ts
await recordAudit(ctx.db, {
  projectId: input.projectId,
  userId: requesterId,
  action: 'member_removed',
  metadata: { removedUserId: input.userId }
})
```

`accept` and `cancelInvite` record nothing (no `projectId` in their inputs; see Maintenance notes).

**Verify**: `bun run check-types` → exit 0 (compiles only if Plan 016's catalog includes the two actions).

### Step 4: Audit assertions in tests

Append to `members.test.ts` (model on how `environments.test.ts` asserts `auditLog` rows — it queries the table directly):

1. After a successful `invite`: one `audit_log` row with `action: 'member_invited'`, `projectId` = the project, `targetKey` = invited email.
2. After a successful `remove`: one row `action: 'member_removed'`, metadata contains the removed userId.
3. Failed invite (seat limit reached) records **no** audit row.

**Verify**: `cd packages/api && bun test routers/members` → all pass, including 3 new cases.

## Test plan

Covered in steps 2 and 4: existing suite green with zero edits (extraction proof), plus the three audit assertions. Full gate: `cd packages/api && bun test` → all pass.

## Done criteria

- [ ] `packages/api/src/lib/members-service.ts` exists; router delegates (each procedure body is a single expression)
- [ ] Existing members tests pass unmodified; 3 new audit assertions pass
- [ ] `grep -n "recordAudit" packages/api/src/lib/members-service.ts` → exactly 2 call sites (invite, remove)
- [ ] `grep -n "TODO: send invitation email" packages/api/src/lib/members-service.ts` → 1 match (preserved)
- [ ] `bun run check-types` exits 0; `cd packages/api && bun test` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 016 is not DONE (`member_invited` won't typecheck in `recordAudit`).
- Any existing members test fails after step 2 — the movement altered behavior; if you can't see the divergence in one comparison pass, report it.
- `safeRemoveMember`'s ctx type cannot be satisfied from the service signature.
- `members.test.ts` does not exist — the extraction loses its safety net; write characterization tests first OR report and wait for direction.

## Maintenance notes

- `accept`/`cancelInvite` audit: needs a decision on which project to attach org-level events to (audit_log.projectId is NOT NULL). Options: resolve first project like `accept` already does for navigation, or make projectId nullable for org-scoped events. Deliberately deferred — worth 5 minutes of maintainer thought, not an executor guess.
- The redundant seat-limit reads inside `invite` (subscription row read 2–3×, members counted twice) are the org/billing consolidation candidate — now concentrated in one file, easier to fix later.
- Reviewers: diff service bodies against the old router side-by-side; the only non-mechanical additions should be the two `recordAudit` calls.
- The invite/accept seat checks remain check-then-act (audit finding CORRECTNESS-01, race under concurrency) — unchanged here by design; fix belongs with a DB-level constraint, tracked separately.
