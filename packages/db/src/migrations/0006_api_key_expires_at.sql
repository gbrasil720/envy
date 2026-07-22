-- Migration Command: drizzle-kit generate
-- Plan 012: Add expiresAt to api_key

ALTER TABLE "api_key" ADD COLUMN "expires_at" timestamp NOT NULL DEFAULT (now() + interval '90 days');