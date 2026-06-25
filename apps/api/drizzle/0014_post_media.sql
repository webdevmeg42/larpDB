ALTER TABLE "posts"
  ADD COLUMN "media_type" text CHECK ("media_type" IN ('photo', 'video')),
  ADD COLUMN "media_urls" text[];
