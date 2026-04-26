ALTER TABLE "user" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_skipped_at" timestamp;--> statement-breakpoint
UPDATE "user" SET "onboarding_skipped_at" = now() WHERE "onboarding_skipped_at" IS NULL AND "onboarding_completed_at" IS NULL;
