import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investments, investmentEntries } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const createInvestmentEntrySchema = z.object({
  investmentId: z.string().uuid(),
  amountInvested: z.coerce.number(),
  units: z.coerce.number().optional(),
  investedAt: z.coerce.date().optional(),
  notes: z.string().trim().optional().default(""),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function toNumericString(value: number) {
  return value.toFixed(2);
}

export const Route = createFileRoute("/api/investment-entries/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const entries = await db
          .select({
            id: investmentEntries.id,
            investmentId: investmentEntries.investmentId,
            amountInvested: investmentEntries.amountInvested,
            units: investmentEntries.units,
            investedAt: investmentEntries.investedAt,
            notes: investmentEntries.notes,
          })
          .from(investmentEntries)
          .innerJoin(
            investments,
            eq(investmentEntries.investmentId, investments.id),
          )
          .where(eq(investments.userId, user.id))
          .orderBy(desc(investmentEntries.investedAt));
        return json({ entries });
      },
      POST: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const payload = await request.json();
        const parsed = createInvestmentEntrySchema.safeParse(payload);

        if (!parsed.success) {
          return json(
            { error: "Invalid request body", issues: parsed.error.flatten() },
            400,
          );
        }

        const { investmentId, amountInvested, units, investedAt, notes } = parsed.data;
        const owned = await db
          .select()
          .from(investments)
          .where(
            and(
              eq(investments.id, investmentId),
              eq(investments.userId, user.id),
            ),
          )
          .limit(1);

        if (!owned.length) {
          return json({ error: "Investment not found" }, 404);
        }

        const [created] = await db
          .insert(investmentEntries)
          .values({
            investmentId,
            amountInvested: toNumericString(amountInvested),
            units: units ?? null,
            investedAt: investedAt ?? new Date(),
            notes,
          })
          .returning();

        return json({ entry: created }, 201);
      },
    },
  },
});
