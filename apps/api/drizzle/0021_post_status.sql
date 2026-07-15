ALTER TABLE "posts"
  ADD COLUMN "status" text NOT NULL DEFAULT 'published' CHECK ("status" IN ('draft', 'published'));
