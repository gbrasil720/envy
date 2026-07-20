-- Migration Command: drizzle-kit generate
-- Plan 011: Replace rawKey with userId on cli_auth_session

ALTER TABLE "cli_auth_session" DROP COLUMN "raw_key";

ALTER TABLE "cli_auth_session" ADD COLUMN "user_id" text;

ALTER TABLE "cli_auth_session" ADD CONSTRAINT "cli_auth_session_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;