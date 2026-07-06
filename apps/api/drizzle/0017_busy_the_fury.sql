ALTER TABLE "schema_templates" ADD COLUMN "type" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "xp_transactions_character_id_type_idx" ON "xp_transactions" ("character_id","type");