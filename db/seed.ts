import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'

import { accounts, categories, categoryGroups, users } from '../src/db/schema'

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
    currencyCode: 'INR',
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

  const [existingGroup] = await db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(eq(categoryGroups.userId, seedUser.id))
    .limit(1)

  if (!existingGroup) {
    const [essentialGroup] = await db
      .insert(categoryGroups)
      .values({
        userId: seedUser.id,
        name: 'Essential',
        type: 'expense',
        icon: 'home',
        color: '#ef4444',
        sortOrder: 0,
      })
      .returning()

    const [lifestyleGroup] = await db
      .insert(categoryGroups)
      .values({
        userId: seedUser.id,
        name: 'Lifestyle',
        type: 'expense',
        icon: 'sparkles',
        color: '#f59e0b',
        sortOrder: 1,
      })
      .returning()

    const [investmentsGroup] = await db
      .insert(categoryGroups)
      .values({
        userId: seedUser.id,
        name: 'Investments',
        type: 'income',
        icon: 'chart-line',
        color: '#10b981',
        sortOrder: 2,
      })
      .returning()

    const seedCategories = [
      { groupId: essentialGroup.id, name: 'Rent', transactionType: 'expense', sortOrder: 0 },
      { groupId: essentialGroup.id, name: 'Utilities', transactionType: 'expense', sortOrder: 1 },
      { groupId: lifestyleGroup.id, name: 'Dining Out', transactionType: 'expense', sortOrder: 2 },
      { groupId: lifestyleGroup.id, name: 'Shopping', transactionType: 'expense', sortOrder: 3 },
      { groupId: investmentsGroup.id, name: 'SIP', transactionType: 'income', sortOrder: 4 },
      { groupId: investmentsGroup.id, name: 'Stocks', transactionType: 'income', sortOrder: 5 },
    ]

    await db.insert(categories).values(
      seedCategories.map((category) => ({
        userId: seedUser.id,
        groupId: category.groupId,
        name: category.name,
        icon: 'tag',
        color: '#64748b',
        transactionType: category.transactionType,
        sortOrder: category.sortOrder,
      })),
    )
  }
}

console.log(`Seed complete for ${seedEmail}`)
