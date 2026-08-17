ALTER TABLE "users" ADD COLUMN "is_blocked" boolean NOT NULL DEFAULT false;
ALTER TABLE "game" ADD COLUMN "is_blocked" boolean NOT NULL DEFAULT false;
ALTER TABLE "characters" ADD COLUMN "is_blocked" boolean NOT NULL DEFAULT false;
