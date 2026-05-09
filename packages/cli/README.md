# Envy CLI

The official command-line interface for [Envy](https://useenvy.dev) — sync `.env` secrets between your machine and your team without ever pasting them in Slack again.

```
envy init     # link this directory to a project
envy push     # upload your local .env to the cloud
envy pull     # pull the latest secrets to your machine
```

---

## Installation

```bash
# npm
npm install -g envy-cli

# bun
bun add -g envy-cli

# pnpm
pnpm add -g envy-cli

# one-off (no install)
npx envy-cli <command>
```

The binary is installed as `envy` in your `PATH`.

**Requirements**: Node.js 18+ (or any runtime that ships a built-in `fetch`, e.g. Bun 1.3+).

---

## Quickstart

```bash
# 1. Authenticate (opens your browser)
envy login

# 2. Link this directory to a project
envy init

# 3. Pull your team's secrets to .env.local
envy pull

# 4. Edit .env.local locally, then sync your changes back
envy push
```

That's the whole loop. The rest of this document is reference material.

---

## Commands

| Command | Signature | Description |
|---|---|---|
| [`login`](#envy-login) | `envy login` | Authenticate the CLI with your Envy account |
| [`logout`](#envy-logout) | `envy logout` | Revoke the CLI token and remove local credentials |
| [`whoami`](#envy-whoami) | `envy whoami` | Show the currently authenticated user |
| [`projects`](#envy-projects) | `envy projects [--create]` | List your projects, or create a new one |
| [`init`](#envy-init) | `envy init [--create]` | Link the current directory to a project (creates `.envy.json`) |
| [`push`](#envy-push) | `envy push [--env <name>]` | Upload `.env*` secrets to Envy with a diff preview |
| [`pull`](#envy-pull) | `envy pull [--env <name>]` | Download secrets from Envy into a local `.env*` file |
| [`open`](#envy-open) | `envy open` | Open the project's dashboard in your browser |

Run `envy --help` or `envy <command> --help` for short usage on any command.

---

## Command reference

### `envy login`

Authenticates the CLI through a browser flow.

```bash
envy login
```

**Flow**

1. The CLI opens `https://useenvy.dev/cli-auth?session=<token>` in your default browser.
2. You confirm the request from your dashboard.
3. The CLI polls the server until it sees `authorized` (5 minute timeout).
4. The resulting API key is written to `~/.envy/credentials.json` with mode `0600`.

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Success |
| `2` | Login cancelled or session expired |
| `3` | Network error reaching the API |

---

### `envy logout`

Revokes the CLI token on the server and deletes `~/.envy/credentials.json`.

```bash
envy logout
```

**Requirements**: must be authenticated.

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Success |
| `2` | Not authenticated |

---

### `envy whoami`

Prints the current authenticated user and CLI version.

```bash
envy whoami
```

**Requirements**: must be authenticated.

**Sample output**

```
┌──────────────────────────────────┐
│  User     Guilherme Brasil       │
│  Email    gui@useenvy.dev        │
│  Version  v0.1.0                 │
└──────────────────────────────────┘
```

---

### `envy projects`

Lists your projects. With `--create`, prompts for a name and creates a new project (without linking the current directory).

```bash
# list
envy projects

# create
envy projects --create
```

**Flags**

| Flag | Description |
|---|---|
| `--create` | Prompt for a name and create a new project |

**Sample output**

```
┌─────────────────────────────────────────────────────────┐
│  envy-test           development  3 secrets  1d ago     │
│  meu-projeto         development  1 secret   9d ago     │
│  teste-criar-cli     —            0 secrets  never      │
└─────────────────────────────────────────────────────────┘

✓ 3 projects
Run "envy init" to link a directory  ·  "envy projects --create" to add a project
```

> **Tip**: `envy init --create` does both — creates a new project *and* links the current directory to it in one step.

---

### `envy init`

Links the current directory to an Envy project by writing `.envy.json`. If a `.gitignore` exists, `.envy.json` is added automatically.

```bash
# select an existing project
envy init

# create a new project and link it here
envy init --create
```

**Flags**

| Flag | Description |
|---|---|
| `--create` | Create a new project instead of selecting an existing one |

**Interactive prompts**

1. If `.envy.json` already exists — confirm overwrite.
2. With `--create` — project name. Without — pick from your projects.
3. Default environment for the directory (`development`, `staging`, `production`).

**Result**

Writes `.envy.json` (see [Configuration files](#configuration-files)).

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Usage error (no projects in account, etc.) |
| `2` | Not authenticated |

---

### `envy push`

Uploads selected `.env*` files to the configured project + environment, after showing a diff and asking for confirmation.

```bash
# push to the environment recorded in .envy.json
envy push

# override the target environment
envy push --env production
```

**Flags**

| Flag | Description |
|---|---|
| `--env <name>` | Target environment. Overrides the value in `.envy.json`. |

**Behaviour**

1. Scans the working directory for files matching `.env`, `.env.local`, `.env.<anything>`.
2. If multiple are found, prompts you to pick which to push (multi-select).
3. Parses each selected file. If the same key appears in multiple files with different values, prompts you to pick the winning value per key.
4. Hashes secrets locally and asks the server which keys are **added**, **changed**, or **unchanged** — no plaintext is sent for the diff.
5. Renders a colour-coded diff and asks for confirmation.
6. On confirm, encrypts the changed/added secrets client-side with the project's master key and uploads them.

**Sample output**

```
✔ Select files to push: .env, .env.local

  Changes to "production":

┌────────────────────────────────────────────────┐
│  + DATABASE_URL                                │
│  ~ STRIPE_SECRET                               │
│    OPENAI_API_KEY                              │
└────────────────────────────────────────────────┘

  +1 added  ~1 changed  1 unchanged

✔ Push changes to "production"? Yes

┌──────────────────────────────────┐
│  Project      my-saas            │
│  Environment  production         │
│  Pushed       2 secret(s)        │
│  Files        .env, .env.local   │
└──────────────────────────────────┘

✓ Secrets pushed successfully
Run "envy pull" to sync to another machine
```

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Success (or nothing to push) |
| `1` | Usage error (no project linked, no `.env` files found, etc.) |
| `2` | Not authenticated |
| `5` | Server returned an unexpected response |

---

### `envy pull`

Decrypts secrets from the configured project + environment and writes them to a local `.env*` file.

```bash
# pull from the environment recorded in .envy.json
envy pull

# override the source environment
envy pull --env staging
```

**Flags**

| Flag | Description |
|---|---|
| `--env <name>` | Source environment. Overrides the value in `.envy.json`. |

**Behaviour**

1. Calls `secrets.reveal` on the server, which decrypts using your project's master key.
2. Scans the working directory for existing `.env*` files. Prompts you to pick a destination file or create a new one (default `.env.local`).
3. If the destination file already exists:
   - If it has keys *not* present in the remote, you're asked whether to keep those local-only keys or overwrite the file completely.
   - Otherwise you're asked to confirm the overwrite.
4. Writes the values back as `KEY="value"` with `\n`, `\r`, `\\`, and `"` escaped.

**Sample output**

```
✓ 12 secrets fetched from "production"

✔ Write secrets to: .env.local

┌──────────────────────────────────┐
│  Project      my-saas            │
│  Environment  production         │
│  Secrets      12 pulled          │
│  File         .env.local         │
└──────────────────────────────────┘

✓ Secrets pulled successfully
Run "envy push" to sync changes back
```

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Usage error (no project linked, invalid filename, etc.) |
| `2` | Not authenticated |

---

### `envy open`

Opens the project's dashboard at `https://useenvy.dev/dashboard/<slug>` in your default browser. If the directory isn't linked, opens the dashboard root.

```bash
envy open
```

**Requirements**: must be authenticated. A linked project (`envy init`) is recommended but not required.

---

## Configuration files

### `.envy.json` (per-directory)

Created by `envy init`. Tells the CLI which project + environment this directory targets.

```json
{
  "project_id": "d0fed5b7-d42b-4b13-932c-c1282868d59c",
  "project_slug": "my-saas",
  "environment": "production"
}
```

- **Location**: the directory you ran `envy init` in.
- **Gitignore**: appended to `.gitignore` automatically when one exists.
- **Safe to commit?** Yes — it contains no secrets, only IDs that are useless without your CLI token.

### `~/.envy/credentials.json` (per-user)

Created by `envy login`. Holds your personal CLI token.

```json
{
  "token": "envy_live_...",
  "user": "Guilherme Brasil",
  "api_url": "https://api.useenvy.dev",
  "created_at": "2026-05-09T16:43:02.624Z"
}
```

- **Location**: your home directory (`~/.envy/credentials.json` on macOS/Linux, `%USERPROFILE%\.envy\credentials.json` on Windows).
- **Permissions**: `0600` — owner read/write only.
- **Never commit this file.**

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ENVY_API_URL` | Override the API server URL (takes precedence over the `api_url` saved in credentials). | `https://api.useenvy.dev` |
| `ENVY_WEB_URL` | Override the dashboard URL used by `envy login` and `envy open`. | `https://useenvy.dev` |
| `ENVY_DEBUG` | When set to any truthy value, prints full stack traces and `fetch` `cause` objects on errors. | unset |

**Self-hosted or local development**:

```bash
export ENVY_API_URL=http://localhost:3000
export ENVY_WEB_URL=http://localhost:3001
envy login
```

---

## Workflows

### Daily team development

```bash
envy login          # once per machine
envy init           # once per project
envy pull           # any time you want fresh secrets
# … hack on .env.local …
envy push           # share your changes with the team
```

### Working across environments

```bash
envy pull --env staging         # grab staging secrets
envy push --env production      # publish to production (with confirm)
```

### Onboarding a new teammate

```bash
envy login
cd path/to/project   # already contains .envy.json from someone else's commit
envy pull
```

They get their own token (revocable independently) and a fully populated `.env.local`.

---

## Troubleshooting

### `Error: Not authenticated`
Run `envy login`.

### `Error: No project linked`
The current directory has no `.envy.json`. Run `envy init`.

### `Error: No .env files found in current directory`
Create one and try again:

```bash
touch .env
envy push
```

…or fetch them with `envy pull`.

### `Error: fetch failed`
Network-level failure reaching the API. Re-run with debug output to see the exact cause:

```bash
ENVY_DEBUG=1 envy push
```

Common causes shown by the CLI:

- **DNS lookup failed** (`ENOTFOUND`) — wrong API URL, or no internet.
- **Connection refused** (`ECONNREFUSED`) — API URL points at a server that isn't running.
- **Connection timed out** — VPN, corporate proxy, or firewall.
- **TLS certificate problem** — self-signed or expired cert in the chain.

### `Push failed — unexpected response from server`
The server returned an unexpected payload. Usually means the server is running an old build with a known bug. Update the server or report the issue.

### Conflicts during `envy push`
If the same key appears in multiple selected files with different values, the CLI prompts you to pick the winning value per key.

### Self-hosting or pointing at a different server

```bash
export ENVY_API_URL=https://envy.mycompany.com
envy login
```

`ENVY_API_URL` overrides the `api_url` saved in your credentials, so you can switch servers without re-logging in for one-off commands.

---

## Exit codes

| Code | Name | Meaning |
|---|---|---|
| `0` | OK | Success |
| `1` | USAGE | Misuse of a command (missing config, no `.env` files, invalid arguments) |
| `2` | AUTH | Not authenticated, login expired, or login cancelled |
| `3` | NETWORK | Could not reach the API |
| `4` | PERMISSION | Authenticated but not authorised for the resource |
| `5` | SOFTWARE | Server returned an unexpected response |

---

## Development

This package is part of the [Envy monorepo](../../README.md). All commands below assume you're inside `packages/cli/`.

### Build

```bash
bun run build
```

Bundles `src/index.ts` into `dist/cli.js` (ESM, `--target node`). The `bin` field in `package.json` makes that file the `envy` binary.

### Run from source during development

```bash
bun run --cwd packages/cli src/index.ts <command>
```

Or, after `bun install` at the repo root, link the workspace globally:

```bash
cd packages/cli
npm link
envy --version
```

### Layout

```
src/
  commands/    one file per command, each exporting a register*(program) helper
  lib/
    api.ts        tRPC client (uses ENVY_API_URL → saved api_url → default)
    auth.ts       reads/writes ~/.envy/credentials.json
    banner.ts     ASCII banner shown by interactive commands
    config.ts     reads/writes .envy.json
    constants.ts  default URLs, polling timeouts, config filename
    errors.ts     EnvyError class + EXIT codes
    output.ts     console formatting (success/error/spinner/raw)
  index.ts     entry point — wires up commander + top-level error handler
```

For deeper conventions (error handling, output style, command file structure), see [`CONVENTIONS.md`](./CONVENTIONS.md).

---

*Issues and contributions welcome at [github.com/gbrasil720/envy](https://github.com/gbrasil720/envy).*
