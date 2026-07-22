# Plan 010: Restore a usable full-repo lint baseline and fix actively-wrong docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f0cdd3..HEAD -- biome.json CLAUDE.md README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx | docs
- **Planned at**: commit `4f0cdd3`, 2026-07-20

## Why this matters

`bunx biome check .` currently reports ~13,800 diagnostics — but ~13,700 of them come from one missing ignore: the gitignored TanStack Start build dir `apps/web/.output` (minified bundles). Because the full-repo check is unusable, CI gates lint on a hand-listed subset of paths, and real diagnostics in the shipping UI never fail CI. Separately, `CLAUDE.md` and `README.md` document the **opposite** of the actual Biome style ("tabs, double quotes" vs the configured spaces/single-quotes), which makes any agent hand-format code in exactly the way `biome check` rejects. One config line plus doc corrections restore a trustworthy baseline.

## Current state

- `biome.json` — the `files.includes` negation list (lines 10–30) ignores `**/.next`, `**/dist`, `**/.turbo` etc. but NOT `**/.output`, `**/.nitro`, `**/.vinxi`, or `**/.tanstack`:

```jsonc
// biome.json:10-14 (excerpt)
"includes": [
  "**",
  "!**/.next",
  "!**/dist",
  "!**/.turbo",
```

- `biome.json:32-36` and `:60-66` — actual formatter config:

```jsonc
"formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
...
"javascript": {
  "formatter": {
    "trailingCommas": "none",
    "quoteStyle": "single",
    "semicolons": "asNeeded"
  }
}
```

- `CLAUDE.md:11` — says: `**Linter/formatter**: Biome (tabs, double quotes)` — wrong on both counts.
- `CLAUDE.md` "Code quality" block — says `bunx biome check .   # Lint/format check without writing (CI)` — but CI (`.github/workflows/ci.yml`) runs a scoped check over a path allowlist, not `.`; the full-repo command currently fails with thousands of errors.
- `CLAUDE.md` "Key patterns" — lists server env as `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, omitting `SERVER_ENCRYPTION_KEY` and `APP_URL`, which the server requires (see `packages/env/src/server.ts` and `apps/server/.env.example`).
- `README.md` — Code-Quality table row states Biome "(tabs, double quotes)".

Convention note: this repo uses conventional commits (`feat(ui): …`, `fix(auth): …` — see `git log --oneline`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full-repo lint | `bunx biome check .` | after step 1: diagnostic count drops from ~13,800 to ≤ ~50 (all in real source) |
| Scoped CI gate | `bun run test:ci` | same result as before the change (biome subset + types + tests) |
| Typecheck | `bun run check-types` | exit 0 |

Note: `bun run test` needs local Postgres for API integration tests (`bun run db:docker:up` first, see `TESTING.md`). For this plan, typecheck + biome are sufficient; do not start docker unless already running.

## Scope

**In scope** (the only files you may modify):
- `biome.json`
- `CLAUDE.md`
- `README.md` (only the Biome style row / lint-command mentions)

**Out of scope** (do NOT touch):
- Fixing the ~42 real source diagnostics in `apps/web/src`, `packages/ui/src`, `packages/cli/src/tui` — that is a separate follow-up; do not fix or suppress any lint error in source files.
- `.github/workflows/ci.yml` — widening the CI gate only makes sense after the source diagnostics are cleared; leave the workflow as is.
- `package.json` `test:ci` script — same reason.

## Git workflow

- Branch: `advisor/010-biome-ignore-output` (branch from current branch)
- One commit, message style: `chore(dx): ignore build output in biome, correct style docs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add build-output dirs to the Biome ignore list

In `biome.json`, extend `files.includes` with negations for TanStack Start / Nitro build dirs, alongside the existing `"!**/dist"` entries:

```jsonc
"!**/.output",
"!**/.nitro",
"!**/.vinxi",
"!**/.tanstack"
```

**Verify**: `bunx biome check . 2>&1 | tail -5` → total errors reported drops to double digits (~40 errors in real source files under `apps/web/src`, `packages/ui/src`, `packages/cli/src/tui`); no file path under `.output/` appears in the output. The command may still exit non-zero — that is expected (real diagnostics remain, out of scope here).

### Step 2: Correct CLAUDE.md — ALREADY APPLIED, verify only

These corrections were applied manually on 2026-07-20 (style line, lint-command comment, and env list — the drift check will show CLAUDE.md changed; that is expected). Do **not** re-edit CLAUDE.md; just verify:

**Verify**: `grep -n "tabs, double quotes" CLAUDE.md` → no matches; `grep -n "SERVER_ENCRYPTION_KEY" CLAUDE.md` → at least one match. If either check fails, apply the original corrections: (1) style line → `Biome (2-space indent, single quotes, no semicolons, no trailing commas)`; (2) `bunx biome check .` comment → full-repo check, CI gates a scoped subset via test:ci; (3) server env list per `packages/env/src/server.ts`.

### Step 3: Correct README.md style row

Update the Code-Quality/Biome row that mentions "(tabs, double quotes)" to the same corrected style description. Touch nothing else in README.md.

**Verify**: `grep -rn "tabs, double quotes" CLAUDE.md README.md` → zero matches.

## Test plan

No new tests — config and docs only. Regression gate:

- `bun run test:ci` → passes exactly as before (the scoped biome paths are unaffected by the ignore additions).
- `bun run check-types` → exit 0.

## Done criteria

- [ ] `bunx biome check .` no longer reports any diagnostic in a path containing `.output/`, `.nitro/`, `.vinxi/`, or `.tanstack/`
- [ ] `grep -rn "tabs, double quotes" CLAUDE.md README.md` → zero matches
- [ ] CLAUDE.md server env list includes `SERVER_ENCRYPTION_KEY` and `APP_URL`
- [ ] `bun run check-types` exits 0
- [ ] `git status` shows only `biome.json`, `CLAUDE.md`, `README.md` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- After step 1, `bunx biome check .` still reports >500 diagnostics — a different noise source exists; report the top offending paths instead of adding more ignores.
- `packages/env/src/server.ts` does not exist or its schema doesn't match the env vars named here.
- Any step seems to require editing source files under `apps/` or `packages/` — that is out of scope.

## Maintenance notes

- Follow-up (deferred): fix the ~40 real diagnostics in web/ui/tui, then widen `test:ci` and CI to `bunx biome check .` and delete the path allowlist. Also reconcile the root README's CLI section (wrong install name `@envy/cli` vs actual `useenvy`, stale `src/lib/` layout) — documented drift, separate plan.
- Reviewers: check that no ignore pattern accidentally excludes real source (e.g. a package legitimately named `dist`).
