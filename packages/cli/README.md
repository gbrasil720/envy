# Envy CLI

Command-line tool for managing secrets across environments. Authenticate once, push and pull secrets from your project.

---

## Installation

```bash
npm install -g @envy/cli
# or
bun install -g @envy/cli
# or with npx (no install needed)
npx @envy/cli <command>
```

The binary is installed as `envy` in your PATH.

**Requirements**: Node.js 18+ or Bun 1.3.0+

---

## Commands

All commands are interactive (use prompts for secrets, environments, etc). Pipe JSON to `--json` flag for automation.

| Command | Signature | Description |
|---|---|---|
| `init` | `envy init [--create]` | Link this directory to an Envy project |
| `login` | `envy login` | Authenticate with your Envy account |
| `logout` | `envy logout` | Revoke your CLI token and remove credentials |
| `pull` | `envy pull [--env <env>]` | Download secrets to a .env file |
| `push` | `envy push [--env <env>]` | Upload secrets from .env files |
| `whoami` | `envy whoami` | Show your authenticated user profile |

---

## Global Flags

```bash
envy [command] --help       # Show help for a command
envy --version              # Show CLI version
```

---

## Commands Reference

### `envy login`

Authenticate the CLI with your Envy account. Opens your browser for OAuth2 flow.

```bash
envy login
```

**What it does**:
1. Generates a 5-minute session token
2. Opens your browser to `https://useenvy.dev/cli-auth?session=<token>`
3. Polls the server for authorization
4. On success, saves credentials to `~/.envy/credentials.json` (mode `0600`)

**Output**:
```
 Envy v0.0.1
Opening browser for authentication...
If it didn't open, visit: https://useenvy.dev/cli-auth?session=abc-123-def
Waiting for authorization...

 Authenticated as Guilherme Brasil (gui@useenvy.dev)
```

**Exit codes**:
- `0` — Success
- `2` — Login cancelled or expired

---

### `envy logout`

Revoke your CLI token and delete local credentials.

```bash
envy logout
```

**Requirements**: Must be authenticated (`envy login` first).

**Output**:
```
 Logged out successfully
Credentials removed from ~/.envy/credentials.json
Run "envy login" to authenticate again
```

**Exit codes**:
- `0` — Success
- `2` — Not authenticated

---

### `envy whoami`

Show the current authenticated user and CLI version.

```bash
envy whoami
```

**Requirements**: Must be authenticated.

**Output**:
```
 Envy v0.0.1

───────────────────────────
 User     Guilherme Brasil
 Email    gui@useenvy.dev
 Version  v0.0.1
───────────────────────────
```

**Exit codes**:
- `0` — Success
- `2` — Not authenticated

---

### `envy init [--create]`

Link this directory to an Envy project. Creates `.envy.json` config file.

```bash
# Select an existing project
envy init

# Create a new project
envy init --create
```

**Requirements**: Must be authenticated.

**Flags**:
- `--create` — Create a new project instead of selecting one

**Interactive prompts**:
1. If `--create`: Project name
2. If not `--create`: Select from your projects
3. Select default environment (development, staging, production)

**Creates**:
- `.envy.json` in current directory (added to `.gitignore`)

**Output**:
```
 Envy v0.0.1

──────────────────────────────
 Project     my-saas
 Slug        my-saas
 Environment production
──────────────────────────────

 Directory linked to Envy
Run "envy pull" to sync your secrets
```

**Exit codes**:
- `0` — Success
- `1` — Usage error
- `2` — Not authenticated

---

### `envy pull [--env <environment>]`

Download secrets from Envy to a local `.env` file.

```bash
# Use default environment from .envy.json
envy pull

# Override environment
envy pull --env staging
```

**Requirements**:
- Must be authenticated (`envy login`)
- Directory must be linked to a project (`envy init`)

**Flags**:
- `--env <environment>` — Source environment (overrides .envy.json default)

**Interactive prompts**:
1. If multiple `.env*` files exist: Choose target file or create new
2. If target file exists with local-only keys: Keep local-only or overwrite?

**Output**:
```
 Envy v0.0.1
Fetching secrets from "production"...

──────────────────────────────────
 Project     my-saas
 Environment production
 Secrets     12 pulled
 File        .env.local
──────────────────────────────────

 Secrets pulled successfully
Run "envy push" to sync changes back
```

**Exit codes**:
- `0` — Success
- `1` — Usage error (no project linked, no env files found, etc)
- `2` — Not authenticated

---

### `envy push [--env <environment>]`

Upload secrets from local `.env` files to Envy.

```bash
# Use default environment from .envy.json
envy push

# Override environment
envy push --env staging
```

**Requirements**:
- Must be authenticated
- Directory must be linked to a project
- At least one `.env*` file must exist

**Flags**:
- `--env <environment>` — Target environment (overrides .envy.json default)

**Interactive prompts**:
1. If multiple `.env*` files exist: Select which to push (checkbox)
2. If keys exist in multiple files with different values: Resolve conflicts (one per key)
3. Confirm changes before pushing

**Diff format**:
```
  + DATABASE_URL                 added
  ~ STRIPE_SECRET                changed
    OPENAI_API_KEY               unchanged

  +3 added  ~1 changed  2 unchanged
```

**Output**:
```
 Envy v0.0.1
Using .env.local

  Changes to "production":

  + DATABASE_URL                 added
  ~ STRIPE_SECRET                changed
    OPENAI_API_KEY               unchanged

  +2 added  ~1 changed  1 unchanged

────────────────────────────────────
 Project     my-saas
 Environment production
 Pushed      3 secret(s)
 Files       .env.local
────────────────────────────────────

 Secrets pushed successfully
Run "envy pull" to sync to another machine
```

**Exit codes**:
- `0` — Success
- `1` — Usage error (no env files, no project linked, etc)
- `2` — Not authenticated

---

## Configuration Files

### `.envy.json` (project config)

Created by `envy init`. Tells the CLI which project and environment to use.

```json
{
  "project_id": "abc-123-def",
  "project_slug": "my-saas",
  "environment": "production"
}
```

**Location**: Root of your project (same directory as `.gitignore`)
**Gitignore**: Automatically added to `.gitignore`

### `~/.envy/credentials.json` (local credentials)

Created by `envy login`. Stores your API token.

```json
{
  "token": "envy_abc123def456...",
  "user": "Guilherme Brasil",
  "api_url": "https://useenvy.dev"
}
```

**Location**: `~/.envy/` (home directory, hidden)
**Permissions**: `0600` (read/write for owner only)
**Never commit**: This file should never be checked into version control

---

## Environment Variables

The CLI respects these environment variables for configuration:

| Variable | Purpose | Default |
|---|---|---|
| `ENVY_API_URL` | Override API server URL | `https://useenvy.dev` |

**Example** (for self-hosted or local development):

```bash
export ENVY_API_URL=http://localhost:3000
envy login
```

---

## Quickstart

### Step 1: Authenticate

```bash
envy login
```

Your browser opens. Click "Approve" to generate a CLI token.

### Step 2: Link Your Project

```bash
envy init
```

Select your project and default environment.

### Step 3: Sync Secrets

```bash
envy pull
```

Secrets download to `.env.local` (or your choice).

---

## Workflows

### Local Development

```bash
# One-time setup
envy login
envy init

# Daily usage: sync latest secrets
envy pull

# If you update .env locally, push back
envy push
```

### Multiple Environments

```bash
# Pull from staging
envy pull --env staging

# Push to production (with confirmation)
envy push --env production
```

### Team Onboarding

All team members follow the same three-command quickstart:

```bash
envy login
envy init
envy pull
```

Each gets their own `.envy.json` and credentials file (their own API token).

---

## Troubleshooting

### "Not authenticated"

```bash
envy login
```

### "No project linked"

```bash
envy init
```

### "No .env files found"

Create a `.env` file first:

```bash
touch .env
envy push
```

Or use `envy pull` to download from a remote environment.

### "Key exists in multiple files with different values"

The CLI will prompt you to choose which file's value to use. Select one and continue.

### Self-hosted server

```bash
export ENVY_API_URL=https://my-envy-server.com
envy login
```

---

## For Maintainers

### Building the CLI

```bash
bun run build
```

Outputs a standalone binary to `dist/cli` using Bun's `--compile` flag.

### Testing

```bash
bun test
```

Run all unit and integration tests.

### Architecture

See `packages/cli/CONVENTIONS.md` for detailed code patterns, error handling, and testing.

---

*Version 0.0.1 — See ENVY.md for API reference.*
