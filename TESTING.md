# Testing — Envy

## How to run

```bash
# All packages with a test script (via Turborepo)
bun run test

# Local “CI-like” gate (lint + types + tests; needs Postgres for API integration)
bun run db:docker:up
bun run test:ci

# Single package
cd packages/crypto && bun test
cd packages/cli && bun test
cd packages/db && bun test
cd packages/api && bun test
cd apps/web && bun test

# Filter by name
bun test encrypt
bun test packages/cli/src/core/semver
```

## CI

GitHub Actions workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

On every PR and push to `main` / `master` / `v2-dev`:

1. `bun install --frozen-lockfile`
2. `biome check` on tested packages (`crypto`, `api`, CLI `core`, web utils, db roles)
3. `bun run check-types`
4. Postgres 17 service + `drizzle-kit push`
5. `bun run test` (unit + API integration)

> Full-repo `biome check .` still reports pre-existing issues outside this surface; CI scopes lint to the tested tree until the monorepo is cleaned up.

PRs should stay green on this workflow. New domain logic must ship with co-located tests.

## Stack

| Layer | Tool |
|---|---|
| Runner | **Bun test** (`bun:test`) |
| Orchestration | Turborepo task `test` |
| Integration DB | Postgres via `docker compose` or CI service |

## File layout

Co-locate tests with source:

```
packages/crypto/src/encrypt.ts
packages/crypto/src/encrypt.test.ts
packages/cli/src/core/env-files.ts
packages/cli/src/core/env-files.test.ts
apps/web/src/utils/initials.ts
apps/web/src/utils/initials.test.ts
```

Pattern: `*.test.ts` (Bun default).

## What to test (priority)

1. **`@envy/crypto`** — encrypt/decrypt, HMAC, tokens (security)
2. **`@envy/db` pure helpers** — `hasRole`, `effectiveRole` (`src/roles.ts`)
3. **`@envy/api` libs + routers** — vault, org, projects, members, cli-auth, environments
4. **CLI `core/`** — pure utils + services with mocked UI ports / `api`
5. **Web** — pure utils only (e.g. `initials`), not full dashboard UI

## What not to test (for now)

- Ink TUI screens / shadcn components
- Marketing pages
- Better Auth internals
- Snapshot tests of large React dashboards
- `members.remove` via Better Auth (needs real session cookies)

## Conventions

### Unit tests (no DB)

- Prefer pure functions
- Use temp dirs for filesystem (`mkdtemp`)
- Real crypto keys in tests (fixed test keys only — never production secrets)

### CLI services

Mock at module boundaries **before** importing the service:

```ts
import { describe, expect, mock, test } from 'bun:test'

mock.module('../api', () => ({
  api: {
    secrets: {
      reveal: { query: mock(() => Promise.resolve({ secrets: { A: '1' } })) }
    }
  }
}))

const { runPull } = await import('./pull')
```

- UI ports (`PullUI`, `PushUI`, …) — do not render Ink
- `ENVY_HOME` for isolated credentials (`createTempWorkspace` in `core/test/helpers.ts`)

### API libs / routers

- Prefer testing `packages/api/src/lib/*` for domain logic
- Use `createCaller(userId?)` from `packages/api/src/test/caller.ts` for routers
- Factories: `packages/api/src/test/factories.ts`
- Assert `TRPCError` with `rejects.toMatchObject({ code: 'FORBIDDEN' })`
- Requires Postgres (`bun run db:docker:up`)

### New feature checklist

1. Implement domain logic in lib/service (not only in router/command UI)
2. Add co-located `*.test.ts`
3. Cover happy path + 2–3 authz/validation failures
4. `bun test` in the package (or `bun run test` at root)
5. CI green on the PR

## Env for tests

### Unit suites

Crypto, CLI core, `roles`, `plan-limits`, web utils need **no** env vars / DB.

### API integration

Preload (`packages/api/src/test/preload.ts` via `bunfig.toml`) sets:

- `NODE_ENV=test`
- `DATABASE_URL` default `postgres://envy:envy@localhost:5432/envy`
- Fixed test `SERVER_ENCRYPTION_KEY` (32 zero bytes base64)
- Dummy Better Auth / GitHub vars (required by `@envy/env` validation)

```bash
bun run db:docker:up
cd packages/api && bun run test:integration
```

Harness:

| File | Role |
|---|---|
| `src/test/preload.ts` | env before imports |
| `src/test/db.ts` | `getTestDb`, `truncateAll`, `assertDbReady` |
| `src/test/factories.ts` | user / project / member / plan helpers |
| `src/test/caller.ts` | `createCaller(userId?)` → `appRouter.createCaller` |

Never commit real production secrets into test setup.
