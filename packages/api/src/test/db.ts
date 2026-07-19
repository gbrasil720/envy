import { db, sql } from '@envy/db'

/** Shared Drizzle client (singleton from `@envy/db`, pointed at test DATABASE_URL). */
export function getTestDb() {
  return db
}

/**
 * Wipe domain tables between tests. CASCADE clears FK dependents.
 * Order is listed for readability; CASCADE does the heavy lifting.
 */
export async function truncateAll() {
  await db.execute(sql`
		TRUNCATE TABLE
			"secret",
			"audit_log",
			"environment",
			"api_key",
			"cli_auth_session",
			"project",
			"invitation",
			"member",
			"subscription",
			"billing_event",
			"organization",
			"session",
			"account",
			"verification",
			"user",
			"waitlist"
		RESTART IDENTITY CASCADE
	`)
}

/** Quick connectivity check used by beforeAll hooks. */
export async function assertDbReady() {
  try {
    await db.execute(sql`SELECT 1`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Test database unreachable (${message}). ` +
        `Start Postgres with \`bun run db:docker:up\` and ensure DATABASE_URL is set ` +
        `(default postgres://envy:envy@localhost:5432/envy).`
    )
  }
}
