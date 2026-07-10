ALTER TABLE "larp_subscriptions" RENAME TO "adventure_subscriptions";--> statement-breakpoint
ALTER INDEX "larp_subscriptions_game_id_idx" RENAME TO "adventure_subscriptions_game_id_idx";--> statement-breakpoint
ALTER INDEX "larp_subscriptions_user_id_idx" RENAME TO "adventure_subscriptions_user_id_idx";--> statement-breakpoint
ALTER TABLE "site_config" ALTER COLUMN "site_title" SET DEFAULT 'My Adventure';
