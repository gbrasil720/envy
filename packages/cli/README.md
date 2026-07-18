# Envy CLI

The official command-line interface for [Envy](https://useenvy.dev) — sync `.env` secrets between your machine and your team without ever pasting them in Slack again.

```
envy          # open the interactive TUI
envy push     # upload your local .env (headless)
envy pull     # pull secrets to your machine
envy update   # self-update the CLI
```

---

## Installation

```bash
# npm
npm install -g useenvy

# bun
bun add -g useenvy

# one-off (no install)
npx useenvy <command>
```

The binary is installed as `envy` in your `PATH`.

**Requirements**: Node.js 18+ (or Bun 1.3+).

---

## Quickstart

```bash
# Interactive (recommended)
envy
# → Log in, Init, Pull from the TUI home screen

# Or headless / scripts
envy login
envy init
envy pull
envy push
```

---

## TUI (v2)

Running `envy` with no arguments opens a full-screen terminal UI (TTY required).

| Key | Action |
|-----|--------|
| `p` | Push secrets |
| `l` | Pull secrets |
| `i` | Init / link project |
| `j` | Projects |
| `w` | Who am I |
| `o` | Open dashboard |
| `u` | Update CLI |
| `g` | Log in (when logged out) |
| `?` | Help |
| `q` | Quit |
| `esc` | Back |

Force headless even on a TTY: `envy --no-tui <command>` or `ENVY_NO_TUI=1`.

---

## Commands

| Command | Signature | Description |
|---|---|---|
| _(default)_ | `envy` | Open the interactive TUI |
| [`login`](#envy-login) | `envy login` | Authenticate the CLI with your Envy account |
| [`logout`](#envy-logout) | `envy logout` | Revoke the CLI token and remove local credentials |
| [`whoami`](#envy-whoami) | `envy whoami` | Show the currently authenticated user |
| [`projects`](#envy-projects) | `envy projects [--create]` | List your projects, or create a new one |
| [`init`](#envy-init) | `envy init [--create]` | Link the current directory to a project (creates `.envy.json`) |
| [`push`](#envy-push) | `envy push [--env <name>] [-y]` | Upload `.env*` secrets to Envy with a diff preview |
| [`pull`](#envy-pull) | `envy pull [--env <name>] [-y] [-o <file>]` | Download secrets from Envy into a local `.env*` file |
| [`open`](#envy-open) | `envy open` | Open the project's dashboard in your browser |
| [`update`](#envy-update) | `envy update [-y]` | Self-update the CLI (npm/bun global) |
| `tui` | `envy tui` | Force-open the TUI |

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

---

### `envy logout`

Revokes the CLI token on the server and deletes `~/.envy/credentials.json`.

```bash
envy logout
```

---

### `envy whoami`

Prints the current authenticated user and CLI version.

```bash
envy whoami
```

---

### `envy projects`

Lists your projects. With `--create`, prompts for a name and creates a new project.

```bash
envy projects
envy projects --create
```

---

### `envy init`

Links the current directory to an Envy project by writing `.envy.json`.

```bash
envy init
envy init --create
```

---

### `envy push`

Uploads selected `.env*` files after showing a diff and asking for confirmation.

```bash
envy push
envy push --env production
envy push --env production --yes   # CI / non-interactive
```

| Flag | Description |
|---|---|
| `--env <name>` | Target environment (overrides `.envy.json`) |
| `-y, --yes` | Skip confirmation prompts |

---

### `envy pull`

Decrypts secrets and writes them to a local `.env*` file.

```bash
envy pull
envy pull --env staging
envy pull --yes -o .env.local
```

| Flag | Description |
|---|---|
| `--env <name>` | Source environment |
| `-y, --yes` | Skip confirmation; keep local-only keys by default |
| `-o, --output <file>` | Target `.env` filename |

---

### `envy open`

Opens the project's dashboard in your browser.

```bash
envy open
```

---

### `envy update`

Self-updates the global CLI install (npm or bun).

```bash
envy update
envy update --yes
envy self-update   # alias
```

Detects whether you installed via `npm install -g` or `bun add -g`, then runs the matching install command.

---

## Configuration files

### `.envy.json` (per-directory)

```json
{
  "project_id": "d0fed5b7-d42b-4b13-932c-c1282868d59c",
  "project_slug": "my-saas",
  "environment": "production"
}
```

### `~/.envy/credentials.json` (per-user)

```json
{
  "token": "envy_live_...",
  "user": "Guilherme Brasil",
  "api_url": "https://api.useenvy.dev",
  "created_at": "2026-05-09T16:43:02.624Z"
}
```

Permissions: `0600`. **Never commit this file.**

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ENVY_API_URL` | Override the API server URL | `https://api.useenvy.dev` |
| `ENVY_WEB_URL` | Override the dashboard URL | `https://useenvy.dev` |
| `ENVY_DEBUG` | Full stack traces on errors | unset |
| `ENVY_NO_TUI` | Force headless mode | unset |

---

## Exit codes

| Code | Name | Meaning |
|---|---|---|
| `0` | OK | Success |
| `1` | USAGE | Misuse of a command |
| `2` | AUTH | Not authenticated / login cancelled |
| `3` | NETWORK | Could not reach the API |
| `4` | PERMISSION | Authenticated but not authorised |
| `5` | SOFTWARE | Unexpected server response / update failed |

---

## Architecture (v2)

```
src/
  index.ts           # entry — TUI if no args, else Commander
  cli/program.ts     # Commander registration
  commands/          # headless adapters (inquirer + output)
  core/              # domain (no Ink / Commander)
    services/        # login, push, pull, update, …
    env-files.ts     # parse / scan / write .env
  tui/               # Ink + React interactive UI
    app.tsx
    screens/
    components/
```

Business logic lives in `core/services/*` with UI ports. The TUI and headless CLI are adapters only.

See [`CONVENTIONS.md`](./CONVENTIONS.md) for contributor rules.

---

## Development

```bash
# from packages/cli
bun run dev -- --help
bun run test
bun run typecheck
bun run build
node dist/cli.js --version
```

---

*Issues and contributions welcome at [github.com/gbrasil720/envy](https://github.com/gbrasil720/envy).*
