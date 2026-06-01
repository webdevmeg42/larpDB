CREATE TABLE IF NOT EXISTS "game_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_members_game_id_user_id_unique" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "character_schemas" ADD COLUMN "game_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "game_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "game_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "join_mode" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "npcs" ADD COLUMN "game_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "plots" ADD COLUMN "game_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "schema_templates" ADD COLUMN "game_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_members" ADD CONSTRAINT "game_members_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_members" ADD CONSTRAINT "game_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character_schemas" ADD CONSTRAINT "character_schemas_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characters" ADD CONSTRAINT "characters_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "npcs" ADD CONSTRAINT "npcs_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plots" ADD CONSTRAINT "plots_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schema_templates" ADD CONSTRAINT "schema_templates_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_slug_unique" UNIQUE("slug");