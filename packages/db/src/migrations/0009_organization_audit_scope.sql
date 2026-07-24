ALTER TABLE "audit_log" ADD COLUMN "organization_id" text;
--> statement-breakpoint
UPDATE "audit_log"
SET "organization_id" = "project"."organization_id"
FROM "project"
WHERE "audit_log"."project_id" = "project"."id";
--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_project_id_project_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "project_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_log"
ADD CONSTRAINT "audit_log_project_id_project_id_fk"
FOREIGN KEY ("project_id") REFERENCES "public"."project"("id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_log"
ADD CONSTRAINT "audit_log_organization_id_organization_id_fk"
FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_log_organizationId_idx"
ON "audit_log" USING btree ("organization_id");
