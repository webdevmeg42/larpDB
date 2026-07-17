CREATE TABLE IF NOT EXISTS "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"method" text NOT NULL,
	"url" text NOT NULL,
	"status_code" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_sys_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_user_id_idx" ON "request_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_created_at_idx" ON "request_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_registrations_user_id_idx" ON "event_registrations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_registrations_character_id_idx" ON "event_registrations" ("character_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_character_id_idx" ON "purchases" ("character_id");