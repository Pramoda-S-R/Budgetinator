import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investments, investmentValuations } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const valuationIdSchema = z.object({ id: z.string().uuid() });

const updateValuationSchema = z
  .object({
    valuationAmount: z.coerce.number().optional(),
    valuationDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
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

export const Route = createFileRoute("/api/investment-valuations/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const parsedParams = valuationIdSchema.safeParse(params);

        if (!parsedParams.success) {
          return json({ error: "Invalid valuation id" }, 400);
        }

        const payload = await request.json();
        const parsedBody = updateValuationSchema.safeParse(payload);

        if (!parsedBody.success) {
          return json(
            { error: "Invalid request body", issues: parsedBody.error.flatten() },
            400,
          );
        }

        const user = await requireCurrentUser(request);
        const id = parsedParams.data.id;

        const existing = await db
          .select()
          .from(investmentValuations)
          .innerJoin(
            investments,
            eq(investmentValuations.investmentId, investments.id),
          )
          .where(
            and(
              eq(investmentValuations.id, id),
              eq(investments.userId, user.id),
            ),
          )
          .limit(1);

        if (!existing.length) {
          return json({ error: "Valuation not found" }, 404);
        }

        const updates: Partial<typeof investmentValuations.$inferInsert> = {};
        if (
          "valuationAmount" in parsedBody.data &&
          parsedBody.data.valuationAmount !== undefined
        ) {
          updates.valuationAmount = toNumericString(parsedBody.data.valuationAmount);
        }
        if (
          "valuationDate" in parsedBody.data &&
          parsedBody.data.valuationDate !== undefined
        ) {
          updates.valuationDate = parsedBody.data.valuationDate;
        }

        const [updated] = await db
          .update(investmentValuations)
          .set(updates)
          .where(eq(investmentValuations.id, id))
          .returning();

        return json({ valuation: updated });
      },
      DELETE: async ({ request, params }) => {
        const parsedParams = valuationIdSchema.safeParse(params);

        if (!parsedParams.success) {
          return json({ error: "Invalid valuation id" }, 400);
        }

        const user = await requireCurrentUser(request);
        const id = parsedParams.data.id;

        const existing = await db
          .select()
          .from(investmentValuations)
          .innerJoin(
            investments,
            eq(investmentValuations.investmentId, investments.id),
          )
          .where(
            and(
              eq(investmentValuations.id, id),
              eq(investments.userId, user.id),
            ),
          )
          .limit(1);

        if (!existing.length) {
          return json({ error: "Valuation not found" }, 404);
        }

        await db.delete(investmentValuations).where(eq(investmentValuations.id, id));

        return json({ success: true });
      },
    },
  },
});
