/**
 * Bun test preload — must set env BEFORE any package imports `@envy/env/server`
 * or `@envy/db` (both read env at module load).
 *
 * Override DATABASE_URL / SERVER_ENCRYPTION_KEY via the environment when needed.
 */

const TEST_ENCRYPTION_KEY =
  process.env.SERVER_ENCRYPTION_KEY ??
  // 32 zero bytes, base64 — length 44, satisfies z.string().min(44)
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env.DATABASE_URL ?? 'postgres://envy:envy@localhost:5432/envy',
  SERVER_URL: 'http://localhost:3000',
  APP_URL: 'http://localhost:3001',
  SERVER_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
  BETTER_AUTH_SECRET: 'test-better-auth-secret-min-32-chars!!',
  BETTER_AUTH_API_KEY: 'test-better-auth-api-key',
  BETTER_AUTH_URL: 'http://localhost:3000',
  CORS_ORIGIN: 'http://localhost:3001',
  GITHUB_CLIENT_ID: 'test-github-client-id',
  GITHUB_CLIENT_SECRET: 'test-github-client-secret',
  GITHUB_CLIENT_ID_DEV: 'test-github-client-id-dev',
  GITHUB_CLIENT_SECRET_DEV: 'test-github-client-secret-dev'
}

for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value
  }
}
