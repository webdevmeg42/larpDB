ALTER TABLE "game" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "character_schemas_game_id_idx" ON "character_schemas" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "character_schemas_game_id_active_type_idx" ON "character_schemas" ("game_id","is_active","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "characters_game_id_idx" ON "characters" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "characters_game_id_user_id_idx" ON "characters" ("game_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_registrations_event_id_idx" ON "event_registrations" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_registrations_event_id_user_id_idx" ON "event_registrations" ("event_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_game_id_idx" ON "events" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_game_id_status_idx" ON "events" ("game_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_members_user_id_idx" ON "game_members" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "npcs_game_id_idx" ON "npcs" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plots_game_id_idx" ON "plots" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_items_event_id_idx" ON "store_items" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "xp_transactions_character_id_idx" ON "xp_transactions" ("character_id");