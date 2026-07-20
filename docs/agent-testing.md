# Agent testing guide — Envy

**Audience:** coding agents (and humans) adding or changing product code.  
**Goal:** decide *whether* to write tests, *where* they live, *how* to write them, and *when* you are done.

This is the source of truth for test policy. Operational commands also live in [`TESTING.md`](../TESTING.md) and [`CLAUDE.md`](../CLAUDE.md).

---

## 1. Decision tree (start here)

```
Did you change product behavior or security-sensitive code?
│
├─ NO  (docs only, comments, pure formatting, generated files)
│     → Do not add tests. Stop.
│
└─ YES
      │
      ├─ Pure function / pure module (crypto, roles, semver, env parse, plan limits, initials)
      │     → Unit test, co-located `*.test.ts`, no DB. Required.
      │
      ├─ Domain lib under packages/api/src/lib/* (vault, org-utils, create-project, environment)
      │     → Integration test with Postgres harness. Required for behavior changes.
      │
      ├─ tRPC router (authz, Zod, wiring of a lib)
      │     → createCaller test if the router is more than a one-line wrapper. Required for new procedures.
      │
      ├─ CLI core service (runPull, runPush, runLogin, …)
      │     → Service test with mock.module('../api') + UI port mocks. Required.
      │
      ├─ CLI command / Ink TUI screen
      │     → Prefer testing the service it calls. Do not unit-test Ink screens.
      │
      ├─ React dashboard / marketing / shadcn ui
      │     → Do not unit-test. Extract pure helpers if logic is non-trivial, then test those.
      │
      └─ Better Auth plugin internals / removeMember via auth.api
            → Skip unit tests. Only add E2E later if product-critical pain appears.
```

**Default when unsure:** test the **deepest pure or lib layer**, not the UI or HTTP shell.

---

## 2. Priority map (what is worth testing)

| Priority | Location | Why |
|---|---|---|
| **P0** | `packages/crypto` | AES-GCM, HMAC, API tokens — security |
| **P0** | `packages/api/src/lib/secrets-vault.ts` | Encrypt/store/reveal/diff secrets |
| **P0** | `packages/api/src/lib/org-utils.ts` | Membership, soft-delete, seats, plan |
| **P0** | `packages/db/src/roles.ts` | CSV Better Auth roles |
| **P1** | `packages/api/src/lib/create-project.ts` | Free-plan limits, slug, org bootstrap |
| **P1** | Routers: `cli-auth`, `members`, `environments`, `organization` | Device auth, invites, ACL |
| **P1** | `packages/api/src/context.ts` | Bearer API key vs cookie session |
| **P2** | CLI `core/*` utils + `core/services/*` | parse env, auth files, pull/push/init/login |
| **P3** | Web pure utils only (e.g. `apps/web/src/utils/initials.ts`) | Tiny helpers |
| **Skip** | Ink TUI, marketing sections, shadcn `packages/ui`, Better Auth core | Low ROI / wrong layer |

---

## 3. Stack and layout (non-negotiable)

| Item | Rule |
|---|---|
| Runner | **`bun:test` only** (`import { describe, expect, test, mock } from 'bun:test'`) |
| Monorepo | Root `bun run test` → Turborepo task `test` |
| File name | Co-locate: `foo.ts` → `foo.test.ts` (same directory) |
| Import style | Match package (Biome). Prefer no non-null assertions in tests. |
| CI | Must stay green: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |

Do **not** introduce Vitest/Jest unless the whole monorepo migrates.

---

## 4. How to write tests by package

### 4.1 `@envy/crypto` — pure unit

- No env, no DB.
- Real WebCrypto; never mock `encrypt`/`decrypt` in crypto tests.
- Cover: round-trip, wrong key, tampered tag/ciphertext, token format, deterministic hash/HMAC.

```ts
import { describe, expect, test } from 'bun:test'
import { encrypt } from './encrypt'
import { decrypt } from './decrypt'
// ...
```

### 4.2 `@envy/db` — pure roles only without DB

- Test `hasRole` / `effectiveRole` in `roles.ts` (pure).
- Functions that use the global `db` singleton need Postgres + careful isolation; prefer testing them through API libs when possible.

### 4.3 `@envy/api` — libs + routers

**Harness (already exists):**

| File | Use |
|---|---|
| `src/test/preload.ts` + `bunfig.toml` | Sets test env before imports |
| `src/test/db.ts` | `getTestDb()`, `truncateAll()`, `assertDbReady()` |
| `src/test/factories.ts` | `createTestUser`, `createTestProject`, `addMember`, `setOrgPlan` |
| `src/test/caller.ts` | `createCaller(userId?)` → `appRouter.createCaller` |

**Rules:**

1. Prefer testing **libs** (`pushSecrets`, `requireProjectAccess`, …) when routers are thin.
2. Use **`createCaller`** when testing procedure wiring, Zod, or `protectedProcedure`.
3. Use **real crypto** and a fixed test `SERVER_ENCRYPTION_KEY` (preload). Do not mock encrypt in vault tests.
4. Every integration file:

```ts
beforeAll(async () => { await assertDbReady() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await truncateAll() })
```

5. Assert tRPC errors:

```ts
await expect(promise).rejects.toMatchObject({ code: 'FORBIDDEN' })
// or
try {
  await call()
  expect.unreachable('expected error')
} catch (err) {
  expect((err as TRPCError).code).toBe('FORBIDDEN')
}
```

6. Local/CI DB:

```bash
bun run db:docker:up   # postgres://envy:envy@localhost:5432/envy
cd packages/api && bun test
```

7. **Dependencies:** if you import a package from source, declare it in that package’s `package.json` (CI typecheck is strict; e.g. `better-auth` must be a direct dep of `@envy/api` if imported there).

### 4.4 CLI (`packages/cli`) — core + services

**Conventions:** `packages/cli/CONVENTIONS.md` § Testing.

**Rules:**

1. Test `core/` pure modules and `core/services/*`, not Ink screens.
2. Mock **only** at the module boundary (`../api`). Do not mock internal pure helpers.
3. Order matters with Bun mocks:

```ts
import { afterEach, describe, expect, mock, test } from 'bun:test'

const revealQuery = mock(() => Promise.resolve({ secrets: { A: '1' } }))

mock.module('../api', () => ({
  api: {
    secrets: { reveal: { query: (input: unknown) => revealQuery(input) } }
  }
}))

const { runPull } = await import('./pull')
```

4. Isolate credentials with **`ENVY_HOME`** (see `getEnvyHome()` / `createTempWorkspace()` in `core/test/helpers.ts`).
5. Pass **UI ports** as plain objects (`PullUI`, `PushUI`, …). Never render Ink.
6. Use `cwd` options on services when available so you do not depend on process.cwd().
7. For login poll loops, set `ENVY_POLL_INTERVAL_MS=1` (read at call time in `runLogin`).

### 4.5 Web (`apps/web`)

- Only pure utils (e.g. `initials`).
- Do not mount full dashboard with Testing Library unless product explicitly asks for component tests.

---

## 5. What NOT to test (agent anti-patterns)

| Anti-pattern | Why |
|---|---|
| Snapshot entire React pages | Brittle, low signal |
| Re-test Better Auth itself | Their job, not ours |
| Mock Drizzle query-by-query for vault/org | Tests the mock; use real Postgres |
| Test Ink TUI layout | Prefer service + UI port |
| 100% line coverage goals | Prefer risk-based cases |
| Duplicate the same case at router and lib | One solid layer is enough unless wiring is non-trivial |

---

## 6. Minimum cases per change type

When you add or change a behavior, aim for:

| Change | Minimum cases |
|---|---|
| Pure function | Happy path + 1–2 edge cases |
| Authz / roles | Allowed + denied |
| Mutations (create/update/delete) | Success + not found/conflict + forbidden |
| Secrets | Round-trip encrypt path + at least one ACL failure |
| CLI service | Auth required + success with mocks + one abort/error path |
| New tRPC procedure | Zod rejection OR unauthorized + happy path |

---

## 7. Templates

### Unit (pure)

```ts
import { describe, expect, test } from 'bun:test'
import { myFn } from './my-module'

describe('myFn', () => {
  test('does the happy path', () => {
    expect(myFn('input')).toBe('output')
  })

  test('handles edge case', () => {
    expect(myFn('')).toBe('fallback')
  })
})
```

### API lib (integration)

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { TRPCError } from '@trpc/server'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import { createTestProject, createTestUser } from '../test/factories'
import { myDomainFn } from './my-domain'

describe('myDomainFn', () => {
  beforeAll(async () => {
    await assertDbReady()
  })
  beforeEach(async () => {
    await truncateAll()
  })
  afterAll(async () => {
    await truncateAll()
  })

  test('owner can perform action', async () => {
    const owner = await createTestUser()
    const proj = await createTestProject(owner.id, 'Demo')
    await expect(
      myDomainFn(getTestDb(), owner.id, { projectId: proj.id })
    ).resolves.toBeDefined()
  })

  test('stranger is FORBIDDEN', async () => {
    const owner = await createTestUser()
    const stranger = await createTestUser({ email: 'x@test.local' })
    const proj = await createTestProject(owner.id, 'Demo')
    await expect(
      myDomainFn(getTestDb(), stranger.id, { projectId: proj.id })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
```

### CLI service

```ts
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { createTempWorkspace, seedAuth, writeProjectConfig } from '../test/helpers'

const apiCall = mock(() => Promise.resolve({ ok: true }))

mock.module('../api', () => ({
  api: { /* shape used by the service */ }
}))

const { runThing } = await import('./thing')

describe('runThing', () => {
  let cleanup: (() => void) | undefined
  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    apiCall.mockClear()
  })

  test('requires auth', async () => {
    const ws = createTempWorkspace()
    cleanup = ws.cleanup
    await expect(runThing({ cwd: ws.cwd }, ui)).rejects.toMatchObject({
      code: 'AUTH_REQUIRED'
    })
  })
})
```

---

## 8. Definition of done (PR checklist for agents)

Before you stop:

1. [ ] New/changed domain logic has co-located `*.test.ts` (or justified skip per §1 / §5).
2. [ ] Happy path + at least one failure/authz/edge case where relevant.
3. [ ] `bun test` in the touched package(s) passes.
4. [ ] If API integration: Postgres up; no leaked data assumptions (use `truncateAll`).
5. [ ] If new import from a package: dependency declared so **`bun run check-types`** passes in a clean tree.
6. [ ] Root `bun run test` still green when feasible.
7. [ ] CI must remain green — do not merge with failing typecheck/tests.

---

## 9. Commands cheat sheet

```bash
# All tests
bun run test

# Local CI-like gate (scoped biome + types + tests)
bun run db:docker:up
bun run test:ci

# Package
cd packages/crypto && bun test
cd packages/api && bun test
cd packages/api && bun run test:integration
cd packages/cli && bun test
cd apps/web && bun test

# Filter
bun test secrets-vault
bun test runPull
```

**Env (API integration):** set by `packages/api/src/test/preload.ts` when running under that package’s `bunfig.toml`. Default DB URL: `postgres://envy:envy@localhost:5432/envy`.

**Env (CLI):** `ENVY_HOME` for credentials isolation; optional `ENVY_POLL_INTERVAL_MS` for fast login tests.

---

## 10. Architecture reminder (so you pick the right layer)

```
apps/web          → prefer pure utils only
apps/server       → thin HTTP; prefer testing packages/api
packages/api      → routers (thin) + lib (domain)  ← primary backend target
packages/db       → roles pure; services with global db prefer API tests
packages/crypto   → always unit-test changes
packages/cli      → core utils + services (UI ports), not TUI
packages/ui       → skip
```

When adding a feature: **push logic into lib/service first**, then test that. Routers/commands should stay thin and easy to leave lightly tested.

---

## 11. Related docs

| Doc | Role |
|---|---|
| [`TESTING.md`](../TESTING.md) | How to run tests + short stack notes |
| [`CLAUDE.md`](../CLAUDE.md) | Monorepo agent entrypoint |
| [`packages/cli/CONVENTIONS.md`](../packages/cli/CONVENTIONS.md) | CLI structure + testing conventions |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Required CI pipeline |

If this guide conflicts with ad-hoc comments in chat, **follow this file**.
