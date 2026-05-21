import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import { users } from '../src/db/schema'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed script')
}

const sql = neon(databaseUrl)
const db = drizzle({ client: sql })

const seedEmail = process.env.SEED_USER_EMAIL ?? 'demo@budgetinator.dev'

await db
  .insert(users)
  .values({
    email: seedEmail,
    name: 'Demo User',
    currencyCode: 'USD',
    timezone: 'UTC',
  })
  .onConflictDoNothing({ target: users.email })

console.log(`Seed complete for ${seedEmail}`)
