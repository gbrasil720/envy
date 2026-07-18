CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'team');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('personal', 'team');--> statement-breakpoint
CREATE TABLE "billing_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"dodo_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_event_dodo_event_id_unique" UNIQUE("dodo_event_id")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"dodo_customer_id" text NOT NULL,
	"dodo_subscription_id" text,
	"dodo_price_id" text,
	"seat_limit" integer DEFAULT 1 NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "subscription_dodo_subscription_id_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "project_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "type" "organization_type" DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "cli_auth_session" ADD COLUMN "browser_token" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
-- N:1 project → organization. Legacy rows used project.id = organization.id (1:1).
ALTER TABLE "project" ADD COLUMN "organization_id" text;--> statement-breakpoint
UPDATE "project" SET "organization_id" = "id" WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_event" ADD CONSTRAINT "billing_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_event_dodoEventId_uidx" ON "billing_event" USING btree ("dodo_event_id");--> statement-breakpoint
CREATE INDEX "billing_event_organizationId_idx" ON "billing_event" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_organizationId_uidx" ON "subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_dodoCustomerId_idx" ON "subscription" USING btree ("dodo_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_organizationId_userId_uidx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_type_idx" ON "organization" USING btree ("type");--> statement-breakpoint
CREATE INDEX "organization_deletedAt_idx" ON "organization" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "session_activeOrganizationId_idx" ON "session" USING btree ("active_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cli_auth_session_browser_token_uidx" ON "cli_auth_session" USING btree ("browser_token");--> statement-breakpoint
CREATE INDEX "project_organizationId_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "cli_auth_session" ADD CONSTRAINT "cli_auth_session_browser_token_unique" UNIQUE("browser_token");
