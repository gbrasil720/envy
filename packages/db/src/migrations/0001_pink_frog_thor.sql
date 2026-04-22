CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text,
	"environment" text,
	"action" text NOT NULL,
	"target_key" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cli_auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"api_key" text,
	"project_id" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cli_auth_session_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "environment" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invited_by" text,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"encrypted_mk" text NOT NULL,
	"mk_iv" text NOT NULL,
	"mk_tag" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_sub_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "secret" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"key" text NOT NULL,
	"encrypted_val" text NOT NULL,
	"val_iv" text NOT NULL,
	"val_tag" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cli_auth_session" ADD CONSTRAINT "cli_auth_session_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment" ADD CONSTRAINT "environment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_projectId_idx" ON "api_key" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "api_key_userId_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_keyPrefix_idx" ON "api_key" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "audit_log_projectId_idx" ON "audit_log" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audit_log_userId_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cli_auth_session_token_uidx" ON "cli_auth_session" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "cli_auth_session_expiresAt_idx" ON "cli_auth_session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "environment_projectId_name_uidx" ON "environment" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "environment_projectId_idx" ON "environment" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_projectId_userId_uidx" ON "membership" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "membership_projectId_idx" ON "membership" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "membership_userId_idx" ON "membership" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_uidx" ON "project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_createdBy_idx" ON "project" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "secret_projectId_environmentId_key_uidx" ON "secret" USING btree ("project_id","environment_id","key");--> statement-breakpoint
CREATE INDEX "secret_projectId_idx" ON "secret" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "secret_environmentId_idx" ON "secret" USING btree ("environment_id");