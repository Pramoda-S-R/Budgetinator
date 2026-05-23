import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investments, investmentEntries } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const entryIdSchema = z.object({ id: z.string().uuid() });

const updateEntrySchema = z
  .object({
    amountInvested: z.coerce.number().optional(),
    units: z.coerce.number().optional(),
    investedAt: z.coerce.date().optional(),
    notes: z.string().trim().optional(),
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

export const Route = createFileRoute("/api/investment-entries/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const parsedParams = entryIdSchema.safeParse(params);

        if (!parsedParams.success) {
          return json({ error: "Invalid entry id" }, 400);
        }

        const payload = await request.json();
        const parsedBody = updateEntrySchema.safeParse(payload);

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
          .from(investmentEntries)
          .innerJoin(
            investments,
            eq(investmentEntries.investmentId, investments.id),
          )
          .where(
            and(
              eq(investmentEntries.id, id),
              eq(investments.userId, user.id),
            ),
          )
          .limit(1);

        if (!existing.length) {
          return json({ error: "Entry not found" }, 404);
        }

        const updates: Partial<typeof investmentEntries.$inferInsert> = {};
        if (
          "amountInvested" in parsedBody.data &&
          parsedBody.data.amountInvested !== undefined
        ) {
          updates.amountInvested = toNumericString(parsedBody.data.amountInvested);
        }
        if ("units" in parsedBody.data) {
          updates.units =
            parsedBody.data.units !== undefined ? toNumericString(parsedBody.data.units) : null;
        }
        if (
          "investedAt" in parsedBody.data &&
          parsedBody.data.investedAt !== undefined
        ) {
          updates.investedAt = parsedBody.data.investedAt;
        }
        if ("notes" in parsedBody.data) {
          updates.notes = parsedBody.data.notes ?? "";
        }

        const [updated] = await db
          .update(investmentEntries)
          .set(updates)
          .where(eq(investmentEntries.id, id))
          .returning();

        return json({ entry: updated });
      },
      DELETE: async ({ request, params }) => {
        const parsedParams = entryIdSchema.safeParse(params);

        if (!parsedParams.success) {
          return json({ error: "Invalid entry id" }, 400);
        }

        const user = await requireCurrentUser(request);
        const id = parsedParams.data.id;

        const existing = await db
          .select()
          .from(investmentEntries)
          .innerJoin(
            investments,
            eq(investmentEntries.investmentId, investments.id),
          )
          .where(
            and(
              eq(investmentEntries.id, id),
              eq(investments.userId, user.id),
            ),
          )
          .limit(1);

        if (!existing.length) {
          return json({ error: "Entry not found" }, 404);
        }

        await db.delete(investmentEntries).where(eq(investmentEntries.id, id));

        return json({ success: true });
      },
    },
  },
});
