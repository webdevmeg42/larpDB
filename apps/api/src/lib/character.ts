import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characterSchemas } from '../db/schema.js'

type SchemaRow = typeof characterSchemas.$inferSelect

export async function loadCharacterSchemas(
  character: { schemaId: string; classSchemaId: string | null },
): Promise<[SchemaRow[], SchemaRow[]]> {
  return Promise.all([
    db.select().from(characterSchemas).where(eq(characterSchemas.id, character.schemaId)).limit(1),
    character.classSchemaId
      ? db.select().from(characterSchemas).where(eq(characterSchemas.id, character.classSchemaId)).limit(1)
      : Promise.resolve([] as SchemaRow[]),
  ])
}
