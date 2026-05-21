import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'

import { accounts, users } from '../src/db/schema'

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

const [seedUser] = await db.select().from(users).where(eq(users.email, seedEmail)).limit(1)

if (seedUser) {
  const [existingAccount] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, seedUser.id))
    .limit(1)

  if (!existingAccount) {
    await db.insert(accounts).values({
      userId: seedUser.id,
      name: 'Primary Account',
      accountType: 'bank',
      currentBalance: '0',
      includeInNetWorth: true,
      isActive: true,
    })
  }
}

console.log(`Seed complete for ${seedEmail}`)
