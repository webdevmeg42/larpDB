ALTER TABLE "site_config" ADD CONSTRAINT "site_config_game_id_unique" UNIQUE("game_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_event_id_idx" ON "purchases" USING btree ("event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_store_item_id_idx" ON "purchases" USING btree ("store_item_id");
