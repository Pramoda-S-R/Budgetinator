import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investments, investmentValuations } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const createValuationSchema = z.object({
  investmentId: z.string().uuid(),
  valuationAmount: z.coerce.number(),
  valuationDate: z.coerce.date().optional(),
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

export const Route = createFileRoute("/api/investment-valuations/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const vals = await db
          .select({
            id: investmentValuations.id,
            investmentId: investmentValuations.investmentId,
            valuationAmount: investmentValuations.valuationAmount,
            valuationDate: investmentValuations.valuationDate,
          })
          .from(investmentValuations)
          .innerJoin(
            investments,
            eq(investmentValuations.investmentId, investments.id),
          )
          .where(eq(investments.userId, user.id))
          .orderBy(desc(investmentValuations.valuationDate));
        return json({ valuations: vals });
      },
      POST: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const payload = await request.json();
        const parsed = createValuationSchema.safeParse(payload);

        if (!parsed.success) {
          return json(
            { error: "Invalid request body", issues: parsed.error.flatten() },
            400,
          );
        }

        const { investmentId, valuationAmount, valuationDate } = parsed.data;
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
          .insert(investmentValuations)
          .values({
            investmentId,
            valuationAmount: toNumericString(valuationAmount),
            valuationDate: valuationDate ?? new Date(),
          })
          .returning();

        return json({ valuation: created }, 201);
      },
    },
  },
});
