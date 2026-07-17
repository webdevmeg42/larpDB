ALTER TABLE "adventure_subscriptions" RENAME CONSTRAINT "larp_subscriptions_pkey" TO "adventure_subscriptions_pkey";--> statement-breakpoint
ALTER TABLE "adventure_subscriptions" RENAME CONSTRAINT "larp_subscriptions_game_id_user_id_unique" TO "adventure_subscriptions_game_id_user_id_unique";--> statement-breakpoint
ALTER TABLE "adventure_subscriptions" RENAME CONSTRAINT "larp_subscriptions_game_id_game_id_fk" TO "adventure_subscriptions_game_id_game_id_fk";--> statement-breakpoint
ALTER TABLE "adventure_subscriptions" RENAME CONSTRAINT "larp_subscriptions_user_id_users_id_fk" TO "adventure_subscriptions_user_id_users_id_fk";
