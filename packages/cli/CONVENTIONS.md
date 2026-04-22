# Envy CLI — Conventions & Code Standards

Conventions for the `packages/cli` package. Every contributor and every
AI agent working on this codebase must follow this document.

---

## Table of Contents

1. [Directory Structure](#1-directory-structure)
2. [Command Files](#2-command-files)
3. [Lib Files](#3-lib-files)
4. [Types](#4-types)
5. [Error Handling](#5-error-handling)
6. [Output & Terminal UI](#6-output--terminal-ui)
7. [API Communication](#7-api-communication)
8. [Auth & Config Files](#8-auth--config-files)
9. [Naming Conventions](#9-naming-conventions)
10. [Testing](#10-testing)

---

## 1. Directory Structure

```
packages/cli/
├── src/
│   ├── commands/         # one file per CLI command
│   ├── lib/              # shared utilities, no business logic
│   ├── types/            # shared TypeScript types
│   └── index.ts          # entry point — only registers commands
├── package.json
└── tsconfig.json
```

**Rules:**
- `commands/` contains **only** command handler files
- `lib/` contains **only** pure utilities with no Commander.js dependency
- `index.ts` does **not** contain any logic — only imports and registrations
- No circular imports between `lib/` files

---

## 2. Command Files

### File naming

```
src/commands/<command-name>.ts
```

One file per command. The filename matches the CLI command exactly:

```
login.ts     → envy login
pull.ts      → envy pull
set.ts       → envy set
diff.ts      → envy diff
```

### Required structure

Every command file must follow this exact structure:

```ts
// src/commands/pull.ts

import type { Command } from "commander";
import { getConfig } from "../lib/config";
import { getAuth } from "../lib/auth";
import { api } from "../lib/api";
import { output } from "../lib/output";
import { EnvyError } from "../lib/errors";

// 1. Options interface — always named `<CommandName>Options`
interface PullOptions {
  env?: string;
  output?: string;
  overwrite?: boolean;
  format?: "dotenv" | "json" | "shell";
}

// 2. Main handler — always named `<commandName>Command`
// Always async. Never throws — catches and delegates to EnvyError.
export async function pullCommand(options: PullOptions): Promise<void> {
  const auth = getAuth();
  const config = getConfig();

  const spinner = output.spinner("Fetching secrets...");

  try {
    const secrets = await api.secrets.list.query({
      projectId: config.projectId,
      environment: options.env ?? config.defaultEnv,
    });

    spinner.stop();
    output.secretsTable(secrets);
  } catch (err) {
    spinner.stop();
    throw new EnvyError(err, {
      suggestion: "Run 'envy whoami' to check your connection",
    });
  }
}

// 3. Register function — always named `register<CommandName>`
// This is the only function called from index.ts
export function registerPull(program: Command): void {
  program
    .command("pull [env]")
    .description("Pull secrets from a remote environment to .env.local")
    .option("-o, --output <file>", "Output file path", ".env.local")
    .option("--overwrite", "Overwrite existing file without prompting")
    .option(
      "--format <fmt>",
      "Output format: dotenv | json | shell",
      "dotenv"
    )
    .action(async (env: string | undefined, options: PullOptions) => {
      await pullCommand({ ...options, env });
    });
}
```

### Rules

- The handler (`pullCommand`) is **always exported** — makes it testable
- The register function (`registerPull`) is the **only thing** `index.ts` imports
- Options always have an explicit interface — never use `any` or `Record<string, unknown>`
- The `.action()` callback is always a thin wrapper — zero logic inside it
- Flags that accept a fixed set of values must use a union type, not `string`
- All commands are `async` even if currently synchronous — avoids refactors later

---

## 3. Lib Files

### `lib/api.ts` — tRPC client

Single shared instance of the tRPC client. Nothing else lives here.

```ts
// src/lib/api.ts

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@envy/api"; // from packages/api
import { getAuth } from "./auth";
import { API_URL } from "./constants";

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      headers() {
        const auth = getAuth();
        return auth ? { Authorization: `Bearer ${auth.token}` } : {};
      },
    }),
  ],
});
```

**Rules:**
- `api` is a named export, not a default export
- Never instantiate the tRPC client inside a command or lib file
- `headers()` always reads from `getAuth()` — never hardcodes a token

---

### `lib/auth.ts` — credentials file management

```ts
// src/lib/auth.ts

import { existsSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Credentials } from "../types";

const CREDENTIALS_PATH = join(homedir(), ".envy", "credentials.json");

// Returns null if not logged in — callers decide how to handle
export function getAuth(): Credentials | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8")) as Credentials;
  } catch {
    return null;
  }
}

// Throws if directory cannot be created or file cannot be written
export function saveAuth(credentials: Credentials): void {
  const dir = join(homedir(), ".envy");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
  chmodSync(CREDENTIALS_PATH, 0o600); // read/write for owner only
}

export function clearAuth(): void {
  if (existsSync(CREDENTIALS_PATH)) unlinkSync(CREDENTIALS_PATH);
}

// Use this guard at the top of any command that requires auth
export function requireAuth(): Credentials {
  const auth = getAuth();
  if (!auth) {
    throw new EnvyError("Not authenticated", {
      suggestion: "Run 'envy login' to authenticate",
      code: "AUTH_REQUIRED",
    });
  }
  return auth;
}
```

**Rules:**
- `getAuth()` **never throws** — returns `null` if not found
- `requireAuth()` **always throws** a typed `EnvyError` — use this in commands
- `saveAuth()` always calls `chmodSync(0o600)` — never omit this
- No command reads `credentials.json` directly — always goes through this module

---

### `lib/config.ts` — project config file management

```ts
// src/lib/config.ts

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import type { ProjectConfig } from "../types";

const CONFIG_FILENAME = ".envy.json";

// Walks up the directory tree up to 5 levels — like git
export function findConfig(startDir = process.cwd()): string | null {
  let current = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join(current, CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break; // filesystem root
    current = parent;
  }
  return null;
}

// Returns null if no config found — callers decide how to handle
export function getConfig(): ProjectConfig | null {
  const configPath = findConfig();
  if (!configPath) return null;
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as ProjectConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: ProjectConfig, dir = process.cwd()): void {
  writeFileSync(join(dir, CONFIG_FILENAME), JSON.stringify(config, null, 2));
}

// Use this guard at the top of any command that requires a linked project
export function requireConfig(): ProjectConfig {
  const config = getConfig();
  if (!config) {
    throw new EnvyError("No project linked", {
      suggestion: "Run 'envy init' to link this directory to a project",
      code: "CONFIG_REQUIRED",
    });
  }
  return config;
}
```

**Rules:**
- `getConfig()` **never throws** — returns `null` if not found
- `requireConfig()` **always throws** a typed `EnvyError`
- The filename `.envy.json` lives only in this file as a constant
- Walk logic (5 levels max) lives only in `findConfig()` — never duplicated

---

### `lib/output.ts` — terminal UI

Single module for all terminal output. **No `console.log` anywhere else.**

```ts
// src/lib/output.ts

import ora from "ora";
import pc from "picocolors";

// Spinner
export const output = {
  // Loading spinner
  spinner(text: string) {
    return ora({ text, color: "green" }).start();
  },

  // Success line: ✓ <message>
  success(message: string): void {
    console.log(`${pc.green("✓")} ${message}`);
  },

  // Error line: ✗ <message> \n  → <suggestion>
  error(message: string, suggestion?: string): void {
    console.error(`${pc.red("✗")} ${pc.red(message)}`);
    if (suggestion) console.error(`  ${pc.dim("→")} ${suggestion}`);
  },

  // Warning line: ⚠ <message>
  warn(message: string): void {
    console.warn(`${pc.yellow("⚠")} ${message}`);
  },

  // Info line: plain dimmed text
  info(message: string): void {
    console.log(pc.dim(message));
  },

  // Code inline: monospaced highlight
  code(text: string): string {
    return pc.cyan(text);
  },

  // Secret value: always masked
  masked(key: string, status: "updated" | "new" | "unchanged"): void {
    const statusColor = {
      updated: pc.yellow("updated"),
      new: pc.green("new"),
      unchanged: pc.dim("unchanged"),
    }[status];

    console.log(
      `  ${pc.bold(key.padEnd(24))} ${pc.dim("●●●●●●●●●●●●")}  ${statusColor}`
    );
  },

  // Diff output between two environments
  diff(result: DiffResult): void {
    for (const key of result.both)
      console.log(`  ${pc.green("✓")}  ${pc.dim(key.padEnd(24))} in both`);
    for (const key of result.onlyFrom)
      console.log(`  ${pc.yellow("+")}  ${pc.bold(key.padEnd(24))} ${pc.yellow("only in source → missing in target")}`);
    for (const key of result.onlyTo)
      console.log(`  ${pc.blue("-")}  ${pc.dim(key.padEnd(24))} ${pc.blue("only in target")}`);
  },

  // Empty line
  br(): void {
    console.log();
  },
};
```

**Rules:**
- `console.log` / `console.error` is **banned everywhere except** `lib/output.ts`
- All user-facing strings use this module — makes `--json` support trivial later
- Never use `process.exit()` inside output — only inside the error handler in `index.ts`
- Colors use `picocolors` — not `chalk`, not `kleur`, not ANSI escape codes directly
- Values shown to the user are **always masked** with `output.masked()` — never raw

---

### `lib/errors.ts` — error handling

```ts
// src/lib/errors.ts

interface EnvyErrorOptions {
  suggestion?: string;  // what to do next
  code?: string;        // machine-readable error code
  exitCode?: number;    // defaults to 1
}

export class EnvyError extends Error {
  suggestion?: string;
  code?: string;
  exitCode: number;

  constructor(
    message: string | unknown,
    options: EnvyErrorOptions = {}
  ) {
    // Accepts both string and unknown (from catch blocks)
    const msg =
      message instanceof Error
        ? message.message
        : typeof message === "string"
          ? message
          : "An unexpected error occurred";

    super(msg);
    this.name = "EnvyError";
    this.suggestion = options.suggestion;
    this.code = options.code;
    this.exitCode = options.exitCode ?? 1;
  }
}

// Exit codes
export const EXIT = {
  SUCCESS: 0,
  ERROR: 1,       // generic usage error
  AUTH: 2,        // authentication / permission error
  NETWORK: 3,     // network / API unreachable
  PERMISSION: 4,  // insufficient role
} as const;
```

**Rules:**
- **Never** use `process.exit()` inside a command or lib file
- All errors propagate as `EnvyError` to `index.ts`, which handles `process.exit()`
- When catching unknown errors from tRPC, always wrap in `EnvyError`:
  ```ts
  } catch (err) {
    throw new EnvyError(err, { suggestion: "..." });
  }
  ```
- `suggestion` is **always** a runnable CLI command or a URL — never prose

---

### `lib/constants.ts` — shared constants

```ts
// src/lib/constants.ts

export const API_URL =
  process.env.ENVY_API_URL ?? "https://useenvy.dev";

export const CONFIG_FILENAME = ".envy.json";

export const CREDENTIALS_DIR = ".envy";
export const CREDENTIALS_FILE = "credentials.json";

export const MAX_CONFIG_WALK_DEPTH = 5;

export const CLI_AUTH_POLL_INTERVAL_MS = 2000;
export const CLI_AUTH_TIMEOUT_MS = 90_000;
```

**Rules:**
- All magic strings and numbers live here — never hardcoded in lib or command files
- `API_URL` respects `ENVY_API_URL` env var — enables self-host and local development
- Never import from `packages/env` inside `packages/cli` — the CLI is a standalone binary

---

## 4. Types

```ts
// src/types/index.ts

// Re-exports everything from sub-files
export type { Credentials } from "./credentials";
export type { ProjectConfig } from "./config";
export type { DiffResult } from "./diff";
export type { SecretEntry } from "./secret";
```

```ts
// src/types/credentials.ts
export interface Credentials {
  token: string;
  user: string;
  apiUrl: string;
  createdAt: string; // ISO 8601
}
```

```ts
// src/types/config.ts
export interface ProjectConfig {
  projectId: string;
  projectName: string;
  defaultEnv: string;
  apiUrl: string;
}
```

```ts
// src/types/diff.ts
export interface DiffResult {
  both: string[];
  onlyFrom: string[];
  onlyTo: string[];
  fromEnv: string;
  toEnv: string;
}
```

```ts
// src/types/secret.ts
export interface SecretEntry {
  key: string;
  updatedAt: string;
  updatedBy: string;
  environment: string;
}
```

**Rules:**
- Types that come from `packages/api` via tRPC inference are **not** redefined here
- Use `interface` for object shapes, `type` for unions and aliases
- No `any`, no `object`, no `Record<string, unknown>` in public-facing types
- Types used only inside one command file are defined inline in that file

---

## 5. Error Handling

### Pattern in commands

```ts
// ✅ Correct
export async function pullCommand(options: PullOptions): Promise<void> {
  const auth = requireAuth();       // throws EnvyError if not logged in
  const config = requireConfig();   // throws EnvyError if no project linked

  try {
    const result = await api.secrets.list.query({ ... });
    // handle result
  } catch (err) {
    throw new EnvyError(err, {
      suggestion: "Check your connection and run 'envy whoami'",
      code: "FETCH_FAILED",
      exitCode: EXIT.NETWORK,
    });
  }
}

// ❌ Wrong — never do these
console.error("something went wrong");  // use output.error()
process.exit(1);                        // use EnvyError + exitCode
throw new Error("not logged in");       // use EnvyError
```

### Global error handler in `index.ts`

```ts
// src/index.ts

async function main() {
  const program = new Command();

  // register all commands...

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof EnvyError) {
      output.error(err.message, err.suggestion);
      process.exit(err.exitCode);
    }
    // unexpected error
    output.error("An unexpected error occurred");
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  }
}

main();
```

---

## 6. Output & Terminal UI

### Output format consistency

Every command follows the same output rhythm:

```
[spinner starts]
[spinner stops]
[blank line]
[result summary]
[individual items if applicable]
[blank line]
[final status line]
```

Example for `envy pull`:

```
✓ Connected to useenvy.dev
✓ 12 secrets fetched from "my-saas" [production] in 187ms

  DATABASE_URL              ●●●●●●●●●●●●  updated
  STRIPE_SECRET             ●●●●●●●●●●●●  new
  OPENAI_API_KEY            ●●●●●●●●●●●●  unchanged

Written to .env.local
```

### Spinner rules

- Spinner starts **before** any async operation
- Spinner stops **before** any output is printed
- If an error occurs, spinner stops before the error is thrown
- Spinner text describes what is happening, not what will happen:
  - ✅ `"Fetching secrets..."` 
  - ❌ `"Will fetch secrets"`

### --json flag (future-proofing)

Every command that produces output must check for `--json` and output
structured data instead of formatted text. The flag is registered globally
in `index.ts` and available via `program.opts().json`.

```ts
if (program.opts().json) {
  console.log(JSON.stringify(result, null, 2));
  return;
}
// otherwise use output.*
```

---

## 7. API Communication

### Rules

- All API calls go through `api` from `lib/api.ts`
- Never use `fetch` directly in a command or lib file
- tRPC procedures follow the same naming as the API router:
  ```ts
  api.secrets.list.query({ ... })
  api.secrets.upsert.mutate({ ... })
  api.projects.create.mutate({ ... })
  ```
- Catch tRPC errors and wrap with `EnvyError` — never let raw tRPC errors surface

### Polling pattern (used in `envy login`)

```ts
async function pollForToken(
  sessionToken: string,
  intervalMs = CLI_AUTH_POLL_INTERVAL_MS,
  timeoutMs = CLI_AUTH_TIMEOUT_MS
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await api.cliAuth.poll.query({ sessionToken });

    if (result.status === "authorized" && result.apiKey) {
      return result.apiKey;
    }

    await Bun.sleep(intervalMs);
  }

  throw new EnvyError("Login expired", {
    suggestion: "Run 'envy login' to try again",
    code: "AUTH_TIMEOUT",
    exitCode: EXIT.AUTH,
  });
}
```

---

## 8. Auth & Config Files

### File paths

Always resolve paths through `lib/auth.ts` and `lib/config.ts`.
Never construct `~/.envy/credentials.json` manually in a command.

### Writing rules

| File | chmod | Written by | Read by |
|------|-------|------------|---------|
| `~/.envy/credentials.json` | 0o600 | `saveAuth()` | `getAuth()` / `requireAuth()` |
| `.envy.json` | default | `saveConfig()` | `getConfig()` / `requireConfig()` |

### `.gitignore` rule

When `envy init` creates `.envy.json`, it must append `.envy.json` to
`.gitignore` if the file exists. If `.gitignore` doesn't exist, create it.

```ts
function appendToGitignore(dir: string): void {
  const gitignorePath = join(dir, ".gitignore");
  const entry = "\n# Envy project config\n.envy.json\n";

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".envy.json")) {
      appendFileSync(gitignorePath, entry);
    }
  } else {
    writeFileSync(gitignorePath, entry.trimStart());
  }
}
```

---

## 9. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Command file | `kebab-case.ts` | `set.ts`, `diff.ts` |
| Command handler | `camelCaseCommand` | `pullCommand`, `diffCommand` |
| Register function | `registerCamelCase` | `registerPull`, `registerDiff` |
| Options interface | `CamelCaseOptions` | `PullOptions`, `DiffOptions` |
| Lib file | `camelCase.ts` | `auth.ts`, `output.ts` |
| Lib exports | named exports only | `export function getAuth()` |
| Types file | `camelCase.ts` | `credentials.ts`, `config.ts` |
| Constants | `SCREAMING_SNAKE_CASE` | `API_URL`, `MAX_CONFIG_WALK_DEPTH` |
| Exit codes | `EXIT.<NAME>` | `EXIT.AUTH`, `EXIT.NETWORK` |

### Import order (enforced by Biome)

```ts
// 1. Node built-ins
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// 2. External packages
import type { Command } from "commander";
import pc from "picocolors";

// 3. Internal packages (monorepo)
import type { AppRouter } from "@envy/api";

// 4. Local lib
import { requireAuth } from "../lib/auth";
import { requireConfig } from "../lib/config";
import { api } from "../lib/api";
import { output } from "../lib/output";
import { EnvyError, EXIT } from "../lib/errors";

// 5. Local types
import type { PullOptions } from "../types";
```

---

## 10. Testing

### What to test

| Layer | Test type | Tool |
|---|---|---|
| `lib/auth.ts` | Unit | Bun test |
| `lib/config.ts` | Unit | Bun test |
| `lib/output.ts` | Unit (output capture) | Bun test |
| `lib/errors.ts` | Unit | Bun test |
| `commands/*.ts` handlers | Integration | Bun test + tRPC mock |
| Full CLI commands | E2E | `bun run src/index.ts pull` against test API |

### Test file location

```
src/
├── commands/
│   ├── pull.ts
│   └── pull.test.ts   ← test file co-located with the command
├── lib/
│   ├── auth.ts
│   └── auth.test.ts   ← test file co-located with the lib
```

### Command handler test pattern

```ts
// src/commands/pull.test.ts

import { describe, it, expect, mock, beforeEach } from "bun:test";
import { pullCommand } from "./pull";

// Mock the api module
mock.module("../lib/api", () => ({
  api: {
    secrets: {
      list: {
        query: mock(() =>
          Promise.resolve([
            { key: "DATABASE_URL", updatedAt: "...", updatedBy: "gui" },
          ])
        ),
      },
    },
  },
}));

describe("pullCommand", () => {
  it("writes secrets to .env.local", async () => {
    await expect(pullCommand({ env: "development" })).resolves.toBeUndefined();
  });

  it("throws EnvyError when not authenticated", async () => {
    // mock getAuth to return null
    await expect(pullCommand({ env: "development" })).rejects.toMatchObject({
      name: "EnvyError",
      code: "AUTH_REQUIRED",
    });
  });
});
```

### Rules

- Test files are co-located with the file they test
- Mock only at the module boundary (`lib/api.ts`) — never inside a command
- Each test describes **one behavior**, not one function
- A passing test suite is required before merging — `bun test` in CI

---

*This document is the source of truth for `packages/cli`. When in doubt, follow it.*
