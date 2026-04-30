CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "membership" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "membership" CASCADE;--> statement-breakpoint
ALTER TABLE "api_key" DROP CONSTRAINT "api_key_project_id_project_id_fk";
--> statement-breakpoint
ALTER TABLE "cli_auth_session" DROP CONSTRAINT "cli_auth_session_project_id_project_id_fk";
--> statement-breakpoint
DROP INDEX "api_key_projectId_idx";--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "api_key" ALTER COLUMN "name" SET DEFAULT 'CLI';--> statement-breakpoint
ALTER TABLE "cli_auth_session" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "cli_auth_session" ADD COLUMN "raw_key" text;--> statement-breakpoint
ALTER TABLE "secret" ADD COLUMN "val_hash" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_uidx" ON "waitlist" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_status_idx" ON "waitlist" USING btree ("status");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_id_organization_id_fk" FOREIGN KEY ("id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cli_auth_session_status_idx" ON "cli_auth_session" USING btree ("status");--> statement-breakpoint
ALTER TABLE "api_key" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "cli_auth_session" DROP COLUMN "api_key";--> statement-breakpoint
ALTER TABLE "cli_auth_session" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "plan";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "stripe_sub_id";--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash");