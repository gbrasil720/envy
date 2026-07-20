# Testing — Envy

## For agents

**Read and follow:** [`docs/agent-testing.md`](docs/agent-testing.md)

That guide is the source of truth for:

- Whether a change needs tests
- Where to put them
- How to write unit vs API integration vs CLI service tests
- What not to test
- PR definition of done

## How to run

```bash
# All packages with a test script (via Turborepo)
bun run test

# Local CI-like gate (lint scoped packages + types + tests; needs Postgres for API)
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

GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

On every PR and push to `main` / `master` / `v2-dev`:

1. `bun install --frozen-lockfile`
2. Scoped `biome check` on tested packages
3. `bun run check-types`
4. Postgres 17 + `drizzle-kit push`
5. `bun run test`

**CI must stay green.** New domain logic must ship with co-located tests (see agent guide).

## Stack

| Layer | Tool |
|---|---|
| Runner | Bun test (`bun:test`) |
| Orchestration | Turborepo `test` |
| Integration DB | Docker Postgres / CI service |

## Harness pointers

| Package | Location |
|---|---|
| API env + DB + factories + caller | `packages/api/src/test/` |
| CLI temp workspace / auth seed | `packages/cli/src/core/test/helpers.ts` |

Full detail: [`docs/agent-testing.md`](docs/agent-testing.md).
