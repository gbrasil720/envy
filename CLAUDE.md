# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Envy** is a full-stack TypeScript monorepo built with the Better-T-Stack template. It combines a TanStack Start (React 19) frontend with an Elysia/tRPC backend, Better-Auth authentication, and Drizzle ORM with Neon Postgres.

- **Package manager**: Bun 1.3.0+
- **Monorepo tool**: Turborepo
- **Linter/formatter**: Biome (tabs, double quotes)

## Commands

```bash
# Development
bun run dev            # Start all apps (web on :3001, server on :3000)
bun run dev:web        # Web only
bun run dev:server     # Server only

# Build & types
bun run build          # Build all apps
bun run check-types    # TypeScript type checking across all packages

# Code quality
bun run check          # Biome format + lint with auto-fix

# Database (Drizzle)
bun run db:push        # Push schema changes (no migration files)
bun run db:generate    # Generate migration files
bun run db:migrate     # Run pending migrations
bun run db:studio      # Open Drizzle Studio UI
```

## Architecture

### Apps
- **apps/web** — SSR frontend (TanStack Start + TanStack Router, React 19, Tailwind CSS 4, shadcn/ui, tRPC client)
- **apps/server** — Backend API (Elysia, tRPC via `@elysiajs/trpc`, Better-Auth)

### Packages
- **packages/api** — tRPC router with `publicProcedure` and `protectedProcedure`; context extracts Better-Auth sessions from request headers
- **packages/auth** — Better-Auth config with Drizzle adapter; handles `/api/auth/*` routes
- **packages/db** — Drizzle ORM schema and Neon Serverless client; schema lives in `src/schema`; migrations in `src/migrations`
- **packages/env** — Zod-validated env vars via `@t3-oss/env-core`; import `@envy/env/server` or `@envy/env/web`
- **packages/ui** — Shared shadcn/ui components, TailwindCSS config, and the `cn()` utility
- **packages/config** — Base `tsconfig.json` (strict, ESNext, bundler module resolution)

### Key patterns
- **End-to-end type safety**: tRPC connects `packages/api` to the web client with no code generation
- **Auth flow**: Better-Auth session extracted per-request in tRPC context via `auth.api.getSession()`; cross-origin cookies use `SameSite=none`
- **Environment**: Server env = `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`; Web env = `VITE_SERVER_URL`
- **Biome**: Tailwind class sorting is enabled for `clsx`, `cva`, and `cn` call sites
