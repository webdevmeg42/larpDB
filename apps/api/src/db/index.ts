import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../env.js'
import * as schema from './schema.js'

const pool = new Pool({
  connectionString: env.NODE_ENV === 'test'
    ? process.env['TEST_DATABASE_URL'] ?? env.DATABASE_URL
    : env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
export type DB = typeof db
