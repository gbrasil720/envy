# Envy CLI — Conventions & Code Standards

Conventions for the `packages/cli` package (v2 TUI). Every contributor and AI agent working on this codebase must follow this document.

---

## 1. Directory Structure

```
packages/cli/
├── src/
│   ├── index.ts              # entry — TUI vs headless routing only
│   ├── cli/
│   │   └── program.ts        # Commander: register commands
│   ├── commands/             # headless adapters (inquirer + output)
│   ├── core/                 # domain — NO Ink, Commander, or inquirer
│   │   ├── services/         # one file per use-case
│   │   ├── env-files.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── config.ts
│   │   ├── errors.ts
│   │   └── …
│   └── tui/                  # Ink + React interactive UI
│       ├── app.tsx
│       ├── components/
│       └── screens/
├── package.json
└── tsconfig.json
```

**Rules:**
- `core/` has **zero** dependency on Ink, Commander, or `@inquirer/*`
- `commands/` and `tui/` are thin adapters over `core/services/*`
- `index.ts` only routes and handles top-level errors
- No circular imports between `core/` modules

---

## 2. Core services

Every use-case lives in `core/services/<name>.ts` as `runX(...)`.

```ts
export type PushUI = {
  selectFiles: (files: string[]) => Promise<string[]>
  confirm: (message: string) => Promise<boolean>
  onSpinner?: (message: string) => void
  onSuccess?: (summary: PushSummary) => void
}

export async function runPush(
  options: PushOptions,
  ui: PushUI
): Promise<PushSummary | null>
```

**Rules:**
- Services accept a `ui` port for anything interactive
- Services never call `console.log` / `process.exit`
- Errors are thrown as `EnvyError`
- Headless flags (`yes`, `output`, `env`) live on the options object

---

## 3. Headless commands

```
src/commands/<command-name>.ts
```

```ts
export async function pushCommand(options: PushOptions): Promise<void> {
  await runPush(options, {
    selectFiles: async (files) => /* inquirer */,
    confirm: (msg) => /* inquirer */,
    onSuccess: (s) => output.success(...)
  })
}

export function registerPush(program: Command): void {
  program.command('push').action(async (options) => {
    await pushCommand(options)
  })
}
```

**Rules:**
- Handler always exported (testable)
- Register function is the only thing `cli/program.ts` imports
- Options have an explicit interface
- All commands are `async`

---

## 4. TUI screens

```
src/tui/screens/<Name>.tsx
```

**Rules:**
- Screens call `core/services/*` — never duplicate business logic
- Use shared components in `tui/components/`
- English UI strings only
- Brand color: `#3DD68C` via `tui/theme.ts` / `core/theme.ts`
- Never print secret values unmasked

---

## 5. Error handling

- Use `EnvyError` + `EXIT` codes from `core/errors.ts`
- Never `process.exit()` outside `index.ts`
- `suggestion` should be a runnable command or URL

| Code | Meaning |
|------|---------|
| 0 | OK |
| 1 | USAGE |
| 2 | AUTH |
| 3 | NETWORK |
| 4 | PERMISSION |
| 5 | SOFTWARE |

---

## 6. Output (headless)

All headless user-facing output goes through `core/output.ts`.

- No raw `console.log` in commands/services
- Secrets always masked with `maskSecret` / `output.masked`

---

## 7. Auth & config

- Credentials: `~/.envy/credentials.json` mode `0600`
- Project config: `.envy.json` (walk up to 5 levels)
- Always use `getAuth` / `requireAuth` / `getConfig` / `requireConfig`

---

## 8. Self-update

- Implemented in `core/services/update.ts`
- Supports **npm** and **bun** global installs only
- Package name is hard-coded (`useenvy`) — never take it from user input
- Compare versions with `isNewerVersion` (semver), not raw `!==`

---

## 9. Entry routing

```
if no args && TTY && !CI && !ENVY_NO_TUI → startTui()
else → Commander program
```

- `envy` (no args) opens TUI
- `envy tui` force-opens TUI
- `--no-tui` / `ENVY_NO_TUI=1` force headless

---

## 10. Testing

```bash
bun test          # unit tests (core/*)
bun run typecheck
bun run build
```

Prefer testing `core/` pure functions and services with mocked UI ports.

---

## 11. Naming

| Kind | Pattern |
|------|---------|
| Service | `runPush`, `runLogin` |
| Command handler | `pushCommand` |
| Register | `registerPush` |
| Options type | `PushOptions` |
| Screen component | `PushScreen` |
| UI port type | `PushUI` |

---

## 12. Dependencies

Declare all runtime deps in `packages/cli/package.json` (no monorepo hoisting reliance for publish).

TUI stack: **Ink 6 + React 19**. Domain stays framework-agnostic so a future renderer swap is possible.

> Do **not** use Ink 5 — its `react-reconciler@0.29` only supports React 18 and crashes on React 19 (`ReactCurrentOwner` undefined).
