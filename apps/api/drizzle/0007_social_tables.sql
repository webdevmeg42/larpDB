CREATE TABLE "larp_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "larp_subscriptions_game_id_user_id_unique" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "post_likes_post_id_user_id_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "larp_subscriptions" ADD CONSTRAINT "larp_subscriptions_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "larp_subscriptions" ADD CONSTRAINT "larp_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "larp_subscriptions_game_id_idx" ON "larp_subscriptions" USING btree ("game_id");
--> statement-breakpoint
CREATE INDEX "larp_subscriptions_user_id_idx" ON "larp_subscriptions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "posts_game_id_idx" ON "posts" USING btree ("game_id");
--> statement-breakpoint
CREATE INDEX "posts_game_id_created_at_idx" ON "posts" USING btree ("game_id","created_at");
--> statement-breakpoint
CREATE INDEX "comments_post_id_idx" ON "comments" USING btree ("post_id");
--> statement-breakpoint
CREATE INDEX "post_likes_post_id_idx" ON "post_likes" USING btree ("post_id");
