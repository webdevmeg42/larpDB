DO $$ BEGIN
 ALTER TABLE "characters" ADD COLUMN "class_schema_id" uuid REFERENCES "character_schemas"("id");
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
