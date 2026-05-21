import { and, desc, eq, sql } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { db } from '#/db'
import { accountBalanceHistory, accounts } from '#/db/schema'
import { requireCurrentUser } from '#/lib/server-auth'

const createAccountSchema = z.object({
  name: z.string().trim().min(1),
  accountType: z.string().trim().min(1),
  currentBalance: z.coerce.number(),
  includeInNetWorth: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function toNumericString(value: number) {
  return value.toFixed(2)
}

export const Route = createFileRoute('/api/accounts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request)
        const userAccounts = await db
          .select()
          .from(accounts)
          .where(eq(accounts.userId, user.id))
          .orderBy(desc(accounts.createdAt))

        const [summary] = await db
          .select({
            totalNetWorth: sql<string>`COALESCE(SUM(CASE WHEN ${accounts.includeInNetWorth} THEN ${accounts.currentBalance} ELSE 0 END), 0)`,
          })
          .from(accounts)
          .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true)))

        return json({
          accounts: userAccounts,
          totalNetWorth: summary?.totalNetWorth ?? '0',
        })
      },
      POST: async ({ request }) => {
        const user = await requireCurrentUser(request)
        const payload = await request.json()
        const parsed = createAccountSchema.safeParse(payload)

        if (!parsed.success) {
          return json({ error: 'Invalid request body', issues: parsed.error.flatten() }, 400)
        }

        const values = parsed.data

        const [created] = await db
          .insert(accounts)
          .values({
            userId: user.id,
            name: values.name,
            accountType: values.accountType,
            currentBalance: toNumericString(values.currentBalance),
            includeInNetWorth: values.includeInNetWorth ?? true,
            isActive: values.isActive ?? true,
          })
          .returning()

        if (created) {
          await db.insert(accountBalanceHistory).values({
            accountId: created.id,
            balance: created.currentBalance,
          })
        }

        return json({ account: created }, 201)
      },
    },
  },
})
