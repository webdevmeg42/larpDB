ALTER TABLE "users" ADD COLUMN "is_guest" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "guest_expires_at" timestamp;
