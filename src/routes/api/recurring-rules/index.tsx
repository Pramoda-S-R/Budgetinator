import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { recurringRules } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const createRuleSchema = z.object({
  description: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  transactionType: z.enum(["income", "expense"]),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextRunDate: z.string(),
  categoryId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/recurring-rules/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const rows = await db
          .select()
          .from(recurringRules)
          .where(eq(recurringRules.userId, user.id))
          .orderBy(desc(recurringRules.nextRunDate));
        return json({ rules: rows });
      },
      POST: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const payload = await request.json();
        const parsed = createRuleSchema.safeParse(payload);

        if (!parsed.success) {
          return json({ error: "Invalid request body", issues: parsed.error.flatten() }, 400);
        }

        const d = parsed.data;
        const [created] = await db
          .insert(recurringRules)
          .values({
            userId: user.id,
            description: d.description,
            amount: d.amount.toFixed(2),
            transactionType: d.transactionType,
            frequency: d.frequency,
            nextRunDate: new Date(d.nextRunDate),
            categoryId: d.categoryId ?? null,
            accountId: d.accountId ?? null,
          })
          .returning();

        return json({ rule: created }, 201);
      },
    },
  },
});
