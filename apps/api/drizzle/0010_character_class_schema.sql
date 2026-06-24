ALTER TABLE "characters" ADD COLUMN "class_schema_id" uuid REFERENCES "character_schemas"("id");
