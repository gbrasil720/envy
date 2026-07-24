-- Dodo is the authority for subscription state. Existing synthetic Free rows
-- are intentionally removed: no row means the organization is on Free.
ALTER TABLE "subscription" RENAME COLUMN "dodo_price_id" TO "dodo_product_id";--> statement-breakpoint

ALTER TYPE "subscription_status" RENAME TO "subscription_status_legacy";--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('active', 'on_hold', 'cancelled', 'expired', 'failed');--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscription"
  ALTER COLUMN "status" TYPE "subscription_status"
  USING (
    CASE "status"::text
      WHEN 'active' THEN 'active'::"subscription_status"
      WHEN 'trialing' THEN 'active'::"subscription_status"
      WHEN 'past_due' THEN 'on_hold'::"subscription_status"
      WHEN 'canceled' THEN 'cancelled'::"subscription_status"
      WHEN 'incomplete' THEN 'failed'::"subscription_status"
      WHEN 'incomplete_expired' THEN 'expired'::"subscription_status"
      ELSE 'failed'::"subscription_status"
    END
  );--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
DROP TYPE "subscription_status_legacy";--> statement-breakpoint

ALTER TABLE "subscription" ALTER COLUMN "plan" DROP DEFAULT;--> statement-breakpoint
DELETE FROM "subscription" WHERE "plan" = 'free';
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "dodo_customer_id" text;
--> statement-breakpoint
CREATE TABLE "billing_customer" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "dodo_customer_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "billing_customer_organization_id_unique" UNIQUE("organization_id"),
  CONSTRAINT "billing_customer_dodo_customer_id_unique" UNIQUE("dodo_customer_id")
);
--> statement-breakpoint
ALTER TABLE "billing_customer" ADD CONSTRAINT "billing_customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customer_organizationId_uidx" ON "billing_customer" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customer_dodoCustomerId_uidx" ON "billing_customer" USING btree ("dodo_customer_id");
--> statement-breakpoint
INSERT INTO "billing_customer" ("id", "organization_id", "dodo_customer_id")
SELECT gen_random_uuid()::text, "organization_id", "dodo_customer_id"
FROM "subscription"
ON CONFLICT DO NOTHING;
