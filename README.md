# Envy — Secrets Management Platform

Envy is a full-stack TypeScript application for managing environment secrets and configuration across projects, teams, and environments. Built with a modern stack combining TanStack Start (React 19) on the frontend, Elysia/tRPC on the backend, Better-Auth for authentication, and Drizzle ORM with Neon Postgres.

---

## Visão Geral

Envy enables teams to:
- **Store secrets securely** in encrypted environments (development, staging, production)
- **Manage team access** with role-based permissions (owner, admin, member)
- **Sync secrets locally** via CLI (`envy pull`, `envy push`) to `.env` files
- **Track changes** with audit logs for compliance
- **Scale across plans** (Free, Pro, Team) with increasing project and member limits

---

## Stack Tecnológica

| Package | Version | Role |
|---|---|---|
| **Runtime & Build** | | |
| Bun | 1.3.0+ | Package manager & runtime |
| Turborepo | 2.8.12+ | Monorepo orchestration |
| TypeScript | 5.x | Language & type checking |
| Vite | 7.x | Web bundler & dev server |
| tsdown | 0.16.5+ | Server compiler |
| **Frontend (apps/web)** | | |
| React | 19.2.3 | UI framework |
| TanStack Start | 1.141.1+ | Full-stack framework (SSR) |
| TanStack Router | 1.141.1+ | Client router |
| TanStack React Query | 5.80.6+ | Server state management |
| TailwindCSS | 4.1.18+ | Styling |
| shadcn/ui | 3.6.2+ | Component library |
| **Backend (apps/server)** | | |
| Elysia | 1.4.21+ | HTTP server framework |
| tRPC | 11.13.4+ | End-to-end type-safe APIs |
| @elysiajs/trpc | 1.1.0+ | tRPC-Elysia integration |
| Better-Auth | 1.5.5 | Authentication & session management |
| **Database** | | |
| Drizzle ORM | 0.45.1+ | Type-safe query builder |
| drizzle-kit | 0.31.8+ | Schema management & migrations |
| @neondatabase/serverless | 1.0.2+ | Neon Postgres client |
| **CLI (packages/cli)** | | |
| Commander | 14.0.3+ | CLI argument parsing |
| @inquirer/\* | 5-6.x | Interactive prompts |
| @trpc/client | 11.13.4+ | tRPC client for CLI |
| picocolors | 1.1.1 | Terminal color output |
| gradient-string | 3.0.0 | Gradient text (banner) |
| **Shared Libraries** | | |
| @t3-oss/env-core | 0.13.1+ | Environment variable validation |
| Zod | 4.1.13+ | Schema validation |
| dotenv | 17.2.2+ | .env file parsing |
| **UI Components** | | |
| Base UI | 1.0.0 | Headless component primitives |
| Lucide React | 0.546.0+ | Icon library |
| class-variance-authority | 0.7.1 | Component variants |
| clsx | 2.1.1 | Conditional classname utility |
| sonner | 2.0.5+ | Toast notifications |
| next-themes | 0.4.6+ | Theme provider |
| **Code Quality** | | |
| Biome | 2.2.0+ | Linter & formatter (tabs, double quotes) |

---

## Arquitetura

### Directory Structure

```
envy/
├── apps/
│   ├── web/           # TanStack Start frontend (SSR)
│   └── server/        # Elysia backend + tRPC router
├── packages/
│   ├── api/           # tRPC router definitions
│   ├── auth/          # Better-Auth configuration
│   ├── db/            # Drizzle ORM schema & database client
│   ├── env/           # Zod environment variable validation
│   ├── ui/            # Shared shadcn/ui components & Tailwind config
│   ├── cli/           # CLI application (standalone binary)
│   ├── crypto/        # Encryption & hashing utilities
│   └── config/        # Shared TypeScript configuration
├── CLAUDE.md          # Development guidance
├── ENVY.md            # This file
└── package.json       # Root workspace config
```

### Apps

#### `apps/web` — Web Frontend
- **Framework**: TanStack Start (React 19 + SSR)
- **Router**: TanStack Router for client-side navigation
- **State**: TanStack React Query for server state, local React state for UI
- **Styling**: TailwindCSS 4 with custom theme
- **Components**: shadcn/ui + custom dashboard components
- **Auth**: Better-Auth session via tRPC context
- **Features**:
  - Project dashboard (list, create, settings)
  - Environment & secret management UI
  - Team member management
  - Audit log viewer
  - CLI token management

#### `apps/server` — Backend API
- **Framework**: Elysia 1.4.21+ with built-in OpenAPI & validation
- **API Layer**: tRPC via `@elysiajs/trpc` plugin
- **Auth**: Better-Auth handling `/api/auth/*` routes
- **Database**: Drizzle ORM with Neon Postgres
- **Server Env**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `SERVER_ENCRYPTION_KEY`, `APP_URL`
- **Features**:
  - Health check endpoint
  - tRPC router with public & protected procedures
  - Audit log recording
  - Real-time CLI auth polling (for `envy login`)

### Packages

#### `packages/api` — tRPC Router
Exports the complete tRPC router with all procedures:
- `healthCheck` (public) — Server health
- `me.get` (protected) — Current user profile + stats
- `auth.logout` (protected) — Revoke CLI token
- `cliAuth.*` (public/protected) — CLI login flow (start → poll → approve)
- `projects.*` (protected) — Create, list, get projects
- `secrets.*` (protected) — Push, pull, diff, update, delete
- `members.*` (protected) — Invite, list, remove team members
- `auditLog.list` (protected) — Fetch audit trail

**End-to-end type safety**: The web frontend and CLI both import `AppRouter` type from this package for automatic procedure inference.

#### `packages/auth` — Authentication
- Better-Auth configuration with Drizzle adapter
- User, session, account, and verification tables managed by Better-Auth
- Handles OAuth2 flow (if configured)
- Exports `auth.api` for session extraction in tRPC context

#### `packages/db` — Database
- **Schema Files**:
  - `src/schema/auth.ts` — Better-Auth tables (user, session, account, verification, organization, member, invitation)
  - `src/schema/envy.ts` — Domain tables (project, environment, secret, apiKey, auditLog, cliAuthSession)
- **Client**: `@neondatabase/serverless` + Drizzle ORM
- **Migrations**: `src/migrations/` (generated by `drizzle-kit generate`)
- **Scripts**:
  - `bun run db:push` — Sync schema to database
  - `bun run db:generate` — Create migration files
  - `bun run db:migrate` — Run pending migrations
  - `bun run db:studio` — Drizzle Studio UI

#### `packages/env` — Environment Variables
- Zod-validated environment variable schema via `@t3-oss/env-core`
- Two export points:
  - `@envy/env/server` — Server-side vars (DATABASE_URL, BETTER_AUTH_SECRET, etc.)
  - `@envy/env/web` — Client-side vars (VITE_SERVER_URL)
- **Rules**: Never use `process.env` directly; always import from this package

#### `packages/ui` — Shared Component Library
- **Components**: shadcn/ui exports (button, card, dialog, form, etc.)
- **Styles**: `src/styles/globals.css` with Tailwind 4 directives
- **Utilities**: `cn()` function for conditional class merging (clsx + tailwind-merge)
- **Theme**: Next.js themes provider for light/dark mode
- **Exports**:
  - `@envy/ui/components/*` — React components
  - `@envy/ui/lib/*` — Utilities (cn, etc.)
  - `@envy/ui/globals.css` — Global styles
  - `@envy/ui/postcss.config` — PostCSS configuration

#### `packages/cli` — Command-Line Interface
Standalone binary compiled with Bun (not a Node.js module).
- **Entry**: `src/index.ts` → registers commands and error handler
- **Commands** (in `src/commands/`):
  - `login` — Authenticate with Envy account (browser-based)
  - `logout` — Revoke CLI token
  - `whoami` — Show current authenticated user
  - `init` — Link directory to a project (creates `.envy.json`)
  - `pull` — Download secrets to `.env` file
  - `push` — Upload secrets from `.env` files
- **Libraries** (in `src/lib/`):
  - `auth.ts` — Credentials file management (`~/.envy/credentials.json`)
  - `config.ts` — Project config file management (`.envy.json`)
  - `api.ts` — tRPC client (with Bearer token auth)
  - `output.ts` — Terminal UI (spinners, colors, tables)
  - `errors.ts` — EnvyError with exit codes
  - `banner.ts` — Welcome ASCII art
  - `constants.ts` — Magic strings and numbers
- **See**: `packages/cli/README.md` for detailed commands reference

#### `packages/crypto` — Encryption & Hashing
Utilities for:
- **AES-256-GCM encryption** of secrets and master keys
- **PBKDF2 hashing** for API key verification
- **Token generation** for CLI auth
- Used by: `packages/api` (secrets encryption), `packages/cli` (local validation)

#### `packages/config` — Shared Configuration
- Base `tsconfig.json` (strict mode, ESNext target, bundler module resolution)
- Used by all packages and apps

---

## Modelo de Dados

All tables use `text('id').primaryKey()` for UUIDs. Timestamps default to `now()` and auto-update.

### Better-Auth Tables (packages/db/src/schema/auth.ts)

#### `user`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| name | text | NOT NULL |
| email | text | NOT NULL, UNIQUE |
| emailVerified | boolean | NOT NULL, DEFAULT false |
| image | text | nullable |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| updatedAt | timestamp | NOT NULL, DEFAULT now() |

#### `session`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| userId | text | NOT NULL, FK → user.id (CASCADE) |
| token | text | NOT NULL, UNIQUE |
| expiresAt | timestamp | NOT NULL |
| ipAddress | text | nullable |
| userAgent | text | nullable |
| activeOrganizationId | text | nullable |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| updatedAt | timestamp | NOT NULL |
| **Indexes** | | session_userId_idx |

#### `account`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| userId | text | NOT NULL, FK → user.id (CASCADE) |
| providerId | text | NOT NULL |
| accountId | text | NOT NULL |
| accessToken | text | nullable |
| refreshToken | text | nullable |
| idToken | text | nullable |
| accessTokenExpiresAt | timestamp | nullable |
| refreshTokenExpiresAt | timestamp | nullable |
| scope | text | nullable |
| password | text | nullable |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| updatedAt | timestamp | NOT NULL |
| **Indexes** | | account_userId_idx |

#### `verification`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| identifier | text | NOT NULL |
| value | text | NOT NULL |
| expiresAt | timestamp | NOT NULL |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| updatedAt | timestamp | NOT NULL |
| **Indexes** | | verification_identifier_idx |

#### `organization`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| logo | text | nullable |
| metadata | jsonb | nullable (stores `{ plan: 'free' \| 'pro' \| 'team' }`) |
| createdAt | timestamp | NOT NULL |
| **Indexes** | | organization_slug_uidx (UNIQUE) |

#### `member`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| organizationId | text | NOT NULL, FK → organization.id (CASCADE) |
| userId | text | NOT NULL, FK → user.id (CASCADE) |
| role | text | NOT NULL, DEFAULT 'member' |
| createdAt | timestamp | NOT NULL |
| **Indexes** | | member_organizationId_idx, member_userId_idx |

#### `invitation`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| organizationId | text | NOT NULL, FK → organization.id (CASCADE) |
| inviterId | text | NOT NULL, FK → user.id (CASCADE) |
| email | text | NOT NULL |
| role | text | nullable |
| status | text | NOT NULL, DEFAULT 'pending' |
| expiresAt | timestamp | NOT NULL |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | invitation_organizationId_idx, invitation_email_idx |

### Domain Tables (packages/db/src/schema/envy.ts)

#### `project`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY, FK → organization.id (CASCADE) |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| encryptedMk | text | NOT NULL (AES-256-GCM ciphertext of master key) |
| mkIv | text | NOT NULL (initialization vector) |
| mkTag | text | NOT NULL (AEAD authentication tag) |
| createdBy | text | NOT NULL, FK → user.id (RESTRICT) |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| updatedAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | project_slug_uidx (UNIQUE), project_createdBy_idx |
| **Relations** | | organization (one), creator (one user), environments (many), secrets (many), apiKeys (many), auditLogs (many) |

#### `environment`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| projectId | text | NOT NULL, FK → project.id (CASCADE) |
| name | text | NOT NULL |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | environment_projectId_name_uidx (UNIQUE), environment_projectId_idx |
| **Relations** | | project (one), secrets (many) |

#### `secret`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| projectId | text | NOT NULL, FK → project.id (CASCADE) |
| environmentId | text | NOT NULL, FK → environment.id (CASCADE) |
| key | text | NOT NULL |
| encryptedVal | text | NOT NULL (AES-256-GCM ciphertext) |
| valIv | text | NOT NULL (initialization vector) |
| valTag | text | NOT NULL (AEAD authentication tag) |
| valHash | text | NOT NULL (PBKDF2 hash for diff without decryption) |
| createdBy | text | NOT NULL, FK → user.id (RESTRICT) |
| updatedBy | text | NOT NULL, FK → user.id (RESTRICT) |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| updatedAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | secret_projectId_environmentId_key_uidx (UNIQUE), secret_projectId_idx, secret_environmentId_idx |
| **Relations** | | project (one), environment (one), createdBy (one user), updatedBy (one user) |

#### `apiKey`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| userId | text | NOT NULL, FK → user.id (CASCADE) |
| name | text | NOT NULL, DEFAULT 'CLI' |
| keyHash | text | NOT NULL, UNIQUE (PBKDF2 hash) |
| keyPrefix | text | NOT NULL (first 8 chars for display) |
| lastUsedAt | timestamp | nullable |
| revokedAt | timestamp | nullable |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | api_key_userId_idx, api_key_keyPrefix_idx |
| **Relations** | | user (one) |

#### `auditLog`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| projectId | text | NOT NULL, FK → project.id (CASCADE) |
| userId | text | nullable, FK → user.id (SET NULL) |
| environment | text | nullable |
| action | text | NOT NULL |
| targetKey | text | nullable |
| metadata | jsonb | nullable |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | audit_log_projectId_idx, audit_log_userId_idx, audit_log_createdAt_idx |
| **Relations** | | project (one), user (one) |

#### `cliAuthSession`
| Column | Type | Constraints |
|---|---|---|
| id | text | PRIMARY KEY |
| sessionToken | text | NOT NULL, UNIQUE |
| status | text | NOT NULL, DEFAULT 'pending' |
| rawKey | text | nullable (API key generated after approval) |
| expiresAt | timestamp | NOT NULL |
| createdAt | timestamp | NOT NULL, DEFAULT now() |
| **Indexes** | | cli_auth_session_token_uidx (UNIQUE), cli_auth_session_expiresAt_idx, cli_auth_session_status_idx |

---

## API — Endpoints

All endpoints are tRPC procedures. Communication is JSON-RPC 2.0 via HTTP POST to `/trpc/<router>.<procedure>`.

### Authentication

All protected procedures require a valid session (web) or API key (CLI).
- **Web**: Session cookie via Better-Auth
- **CLI**: Bearer token in `Authorization: Bearer <api_key>` header

### Router: `healthCheck` (Public)

#### `healthCheck` → query
**Returns**: `string` ("OK")
**Use**: Verify server is running.

---

### Router: `me` (Protected)

#### `me.get` → query
**Returns**:
```ts
{
  id: string
  name: string
  email: string
  image?: string
  createdAt: Date
  emailVerified: boolean
  plan: 'free' | 'pro' | 'team'
  projectCount: number
  secretCount: number
}
```
**Use**: Get current user profile and stats.

---

### Router: `auth` (Protected)

#### `auth.logout` → mutation
**Input**: None (token from header)
**Returns**: `{ success: boolean }`
**Use**: Revoke current API key (CLI logout).

---

### Router: `cliAuth` (Public/Protected)

#### `cliAuth.start` → mutation
**Input**: None
**Returns**:
```ts
{
  session_token: string (UUID)
  url: string
  expires_at: string (ISO 8601)
}
```
**Use**: Start CLI login flow. Returns browser URL for user to visit.

#### `cliAuth.poll` → query
**Input**: `{ token: string }`
**Returns**:
```ts
| { status: 'pending' }
| { status: 'authorized'; api_key: string }
| { status: 'cancelled' }
```
**Use**: Poll for authorization status. CLI calls this every 2 seconds.

#### `cliAuth.approve` → mutation (Protected)
**Input**: `{ token: string }`
**Returns**: `{ success: boolean }`
**Use**: Approve a pending CLI auth session (user clicks "Approve" in browser).

#### `cliAuth.getSession` → query
**Input**: `{ token: string }`
**Returns**:
```ts
{
  expiresAt: string (ISO 8601)
  status: string
}
```
**Use**: Check if a session is still valid without polling.

#### `cliAuth.cancel` → mutation
**Input**: `{ token: string }`
**Returns**: `{ success: boolean }`
**Use**: Cancel a pending CLI auth session.

---

### Router: `projects` (Protected)

#### `projects.list` → query
**Input**: None
**Returns**:
```ts
{
  id: string
  name: string
  slug: string
  createdAt: Date
  plan: 'free' | 'pro' | 'team'
  environments: { name: string }[]
}[]
```
**Use**: List all projects user is a member of.

#### `projects.create` → mutation
**Input**: `{ name: string (1-64 chars) }`
**Returns**:
```ts
{
  id: string
  name: string
  slug: string
}
```
**Use**: Create a new project. Plan limits enforced.

#### `projects.get` → query
**Input**: `{ slug: string }`
**Returns**:
```ts
{
  id: string
  name: string
  slug: string
  createdAt: Date
  plan: 'free' | 'pro' | 'team'
  role: 'owner' | 'admin' | 'member'
  members: { id: string; userId: string; role: string; createdAt: Date }[]
  environments: { id: string; name: string; createdAt: Date }[]
}
```
**Use**: Get full project details with members and environments.

---

### Router: `secrets` (Protected)

#### `secrets.push` → mutation
**Input**:
```ts
{
  projectId: string
  environment: string (1-64 chars, [a-z0-9_-]+)
  secrets: Record<string, string>
}
```
**Returns**: `{ upserted: number }`
**Use**: Encrypt and store secrets in an environment.

#### `secrets.reveal` → query
**Input**:
```ts
{
  projectId: string
  environment: string (1-64 chars, [a-z0-9_-]+)
}
```
**Returns**:
```ts
{
  secrets: Record<string, string>
}
```
**Use**: Decrypt and return all secrets for an environment. Records audit log.

#### `secrets.diff` → query
**Input**:
```ts
{
  projectId: string
  environment: string (1-64 chars, [a-z0-9_-]+)
  secrets: { key: string; hash: string }[]
}
```
**Returns**:
```ts
{
  added: string[]
  changed: string[]
  unchanged: string[]
}
```
**Use**: Compare local secrets (by hash) with remote. No decryption needed.

#### `secrets.update` → mutation
**Input**:
```ts
{
  projectId: string
  environment: string (1-64 chars, [a-z0-9_-]+)
  key: string
  value: string
}
```
**Returns**: `{ success: boolean }`
**Use**: Update a single secret value.

#### `secrets.delete` → mutation
**Input**:
```ts
{
  projectId: string
  environment: string (1-64 chars, [a-z0-9_-]+)
  key: string
}
```
**Returns**: `{ success: boolean }`
**Use**: Delete a secret from an environment.

---

### Router: `members` (Protected)

#### `members.list` → query
**Input**: `{ projectId: string }`
**Returns**:
```ts
{
  id: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: Date
  user: { id: string; name: string; image?: string }
}[]
```
**Use**: List all members of a project.

#### `members.pending` → query
**Input**: `{ projectId: string }`
**Returns** (admin+ only):
```ts
{
  id: string
  email: string
  role: string
  expiresAt: Date
  createdAt: Date
}[]
```
**Use**: List pending invitations.

#### `members.invite` → mutation
**Input**:
```ts
{
  projectId: string
  email: string
  role: 'admin' | 'member'
}
```
**Returns**: `{ id: string; email: string }`
**Use**: Invite user to project (Team plan required). Expires in 48h.

#### `members.accept` → mutation
**Input**: `{ invitationId: string }`
**Returns**: `{ projectId: string }`
**Use**: Accept an invitation (by any authenticated user).

#### `members.remove` → mutation
**Input**:
```ts
{
  projectId: string
  userId: string
}
```
**Returns**: `{ success: boolean }`
**Use**: Remove a member from project (admin+ required).

#### `members.cancelInvite` → mutation
**Input**: `{ invitationId: string }`
**Returns**: `{ success: boolean }`
**Use**: Cancel a pending invitation (admin+ required).

---

### Router: `auditLog` (Protected)

#### `auditLog.list` → query
**Input**:
```ts
{
  projectId: string
  environment?: string
  limit?: number (1-100, default 50)
  offset?: number (default 0)
}
```
**Returns**:
```ts
{
  id: string
  userId?: string
  environment?: string
  action: string
  targetKey?: string
  metadata?: object
  createdAt: Date
  user?: { id: string; name: string; image?: string } | null
}[]
```
**Use**: Fetch audit trail for a project. User must be a member.

---

## CLI — Especificação Completa

The Envy CLI is a standalone binary compiled with Bun. It communicates with the backend via tRPC over HTTP with Bearer token authentication.

### Installation

```bash
npm install -g @envy/cli
# or
bun install -g @envy/cli
```

The binary is named `envy` (from `bin` in `packages/cli/package.json`).

### Commands

All commands are listed in alphabetical order. Each supports `--help` flag.

| Command | Signature | Description |
|---|---|---|
| `init` | `envy init [--create]` | Link directory to an Envy project |
| `login` | `envy login` | Authenticate the CLI with your Envy account |
| `logout` | `envy logout` | Revoke your CLI token and remove local credentials |
| `pull` | `envy pull [--env <environment>]` | Pull secrets from Envy to a local .env file |
| `push` | `envy push [--env <environment>]` | Push local .env secrets to Envy |
| `whoami` | `envy whoami` | Show the current authenticated user |

### Global Flags

| Flag | Type | Description |
|---|---|---|
| `--help` | boolean | Show command help |
| `--version` | boolean | Show CLI version |

### Quickstart

#### 1. Authenticate

```bash
envy login
```

Opens your browser to authenticate. Creates `~/.envy/credentials.json`.

#### 2. Link Project

```bash
envy init
```

Prompts you to select or create a project. Creates `.envy.json` in current directory.

#### 3. Sync Secrets

```bash
envy pull
```

Downloads secrets to `.env.local` (or prompts for filename). Supports `--env staging` to pull from a different environment.

---

## Desenvolvimento

### Development Commands

All commands run from the root directory:

```bash
# Start all apps (web on :3001, server on :3000)
bun run dev

# Start only web or server
bun run dev:web
bun run dev:server

# Type checking
bun run check-types

# Format & lint (Biome with auto-fix)
bun run check

# Database operations
bun run db:push      # Sync schema to database
bun run db:generate  # Create migration files
bun run db:migrate   # Run pending migrations
bun run db:studio    # Open Drizzle Studio UI

# Build all apps
bun run build
```

### Environment Variables

**Server** (apps/server):
- `DATABASE_URL` — Neon Postgres connection string
- `BETTER_AUTH_SECRET` — Session signing key (generate: `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — Backend URL (e.g., `http://localhost:3000`)
- `CORS_ORIGIN` — Frontend URL (e.g., `http://localhost:3001`)
- `SERVER_ENCRYPTION_KEY` — Master key for AES-256-GCM (generate: `openssl rand -base64 32`)
- `APP_URL` — Full app URL for CLI auth links (e.g., `http://localhost:3001`)

**Web** (apps/web):
- `VITE_SERVER_URL` — Backend URL (e.g., `http://localhost:3000`)

---

## Padrões de Código

### End-to-End Type Safety

tRPC infers types from the router definition. No code generation needed:

```ts
// packages/api/src/routers/projects.ts
export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => { /* ... */ })
})

// apps/web/src/trpc.ts
const trpc = createTRPCClient<AppRouter>({ /* ... */ })
// Type inference: trpc.projects.list.query() ✓ fully typed

// packages/cli/src/lib/api.ts
export const api = createTRPCClient<AppRouter>({ /* ... */ })
// Same: api.projects.list.query() ✓ fully typed
```

### Authentication Context

tRPC context extracts the session per-request:

```ts
// packages/api/src/context.ts
export async function createContext(req: Request): Promise<Context> {
  const session = await auth.api.getSession({ headers: req.headers })
  return { db, session, authHeader: req.headers.get('authorization') }
}

// packages/api/src/index.ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, session: ctx.session } })
})
```

### Encryption at Rest

Master keys and secrets use AES-256-GCM:

```ts
// packages/crypto exports
export async function encrypt(plaintext: string, masterKey: string): Promise<{
  ciphertext: string
  iv: string
  tag: string
}>

export async function decrypt(
  encrypted: { ciphertext: string; iv: string; tag: string; keyVersion: number },
  masterKey: string
): Promise<string>
```

Master key is encrypted with a server key before storage.

### Audit Logging

All secret reads and writes log to `auditLog` table:

```ts
// packages/api/src/routers/secrets.ts
await ctx.db.insert(auditLog).values({
  projectId: input.projectId,
  userId: ctx.session.user.id,
  environment: input.environment,
  action: 'revealed', // or 'pushed', 'secrets_updated', 'secrets_deleted'
  metadata: { count: secrets.length },
  createdAt: new Date()
})
```

---

## Roadmap

- [ ] OAuth2 provider setup (GitHub, Google)
- [ ] Email verification for invitations (Resend integration)
- [ ] Billing integration (DodoPayments)
- [ ] CLI secret masking in logs
- [ ] Web dashboard for secret editing
- [ ] Slack/Teams webhook notifications on secret changes
- [ ] Export secrets as JSON/YAML
- [ ] Secrets rotation scheduling
- [ ] IP allowlisting for API keys

---

*Last updated: 2026-04-22. See CLAUDE.md for development guidance.*
