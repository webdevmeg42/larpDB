DO $$ BEGIN
 CREATE TYPE "public"."store_item_type" AS ENUM('ticket', 'xp', 'item', 'merchandise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adventure_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_subscriptions_game_id_user_id_unique" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "purchases" RENAME COLUMN "unit_price" TO "unit_price_usd";--> statement-breakpoint
ALTER TABLE "store_items" DROP CONSTRAINT "store_items_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "site_config" ALTER COLUMN "site_title" SET DEFAULT 'My Adventure';--> statement-breakpoint
ALTER TABLE "store_items" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "store_items" ADD COLUMN "game_id" uuid;--> statement-breakpoint
ALTER TABLE "store_items" ADD COLUMN "item_type" "store_item_type";--> statement-breakpoint
ALTER TABLE "store_items" ADD COLUMN "price_usd" integer;--> statement-breakpoint
ALTER TABLE "store_items" ADD COLUMN "xp_amount" integer;--> statement-breakpoint
-- Backfill: set game_id from the linked event, default type to merchandise, copy old price
UPDATE "store_items" si
SET
  game_id = e.game_id,
  item_type = 'merchandise',
  price_usd = si.price
FROM "events" e
WHERE si.event_id = e.id;
--> statement-breakpoint
ALTER TABLE "store_items" ALTER COLUMN "game_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "store_items" ALTER COLUMN "item_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "store_items" ALTER COLUMN "price_usd" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adventure_subscriptions" ADD CONSTRAINT "adventure_subscriptions_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adventure_subscriptions" ADD CONSTRAINT "adventure_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adventure_subscriptions_game_id_idx" ON "adventure_subscriptions" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adventure_subscriptions_user_id_idx" ON "adventure_subscriptions" ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_items" ADD CONSTRAINT "store_items_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_items" ADD CONSTRAINT "store_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_members_game_status_idx" ON "game_members" ("game_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schema_templates_game_id_idx" ON "schema_templates" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_items_game_id_idx" ON "store_items" ("game_id");--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN IF EXISTS "currency_name";--> statement-breakpoint
ALTER TABLE "store_items" DROP COLUMN IF EXISTS "price";--> statement-breakpoint
-- Constraint: ticket items must have an event
ALTER TABLE "store_items"
  ADD CONSTRAINT "ticket_requires_event"
    CHECK (item_type != 'ticket' OR event_id IS NOT NULL);
--> statement-breakpoint
-- Constraint: xp items must have xp_amount set
ALTER TABLE "store_items"
  ADD CONSTRAINT "xp_requires_amount"
    CHECK (item_type != 'xp' OR xp_amount IS NOT NULL);