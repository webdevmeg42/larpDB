UPDATE "game" SET "status" = 'inactive' WHERE "status" = 'disabled';
--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "status" SET DEFAULT 'inactive';