CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "larp_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "larp_subscriptions_game_id_user_id_unique" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "characters" ADD COLUMN "class_schema_id" uuid; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "events" ADD COLUMN "tagline" text; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "events" ADD COLUMN "key_times" text; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "events" ADD COLUMN "travel_notes" text; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "phone" text; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "larp_subscriptions" ADD CONSTRAINT "larp_subscriptions_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "larp_subscriptions" ADD CONSTRAINT "larp_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_post_id_idx" ON "comments" ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "larp_subscriptions_game_id_idx" ON "larp_subscriptions" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "larp_subscriptions_user_id_idx" ON "larp_subscriptions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_likes_post_id_idx" ON "post_likes" ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_game_id_idx" ON "posts" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_game_id_created_at_idx" ON "posts" ("game_id","created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characters" ADD CONSTRAINT "characters_class_schema_id_character_schemas_id_fk" FOREIGN KEY ("class_schema_id") REFERENCES "public"."character_schemas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_event_id_idx" ON "purchases" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_store_item_id_idx" ON "purchases" ("store_item_id");--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "site_config" ADD CONSTRAINT "site_config_game_id_unique" UNIQUE("game_id"); EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;