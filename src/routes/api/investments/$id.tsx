import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investments } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const investmentIdSchema = z.object({ id: z.string().uuid() });

const updateInvestmentSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    investmentType: z.string().trim().min(1).optional(),
    symbol: z.string().trim().optional(),
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

export const Route = createFileRoute("/api/investments/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const parsedParams = investmentIdSchema.safeParse(params);

        if (!parsedParams.success) {
          return json({ error: "Invalid investment id" }, 400);
        }

        const payload = await request.json();
        const parsedBody = updateInvestmentSchema.safeParse(payload);

        if (!parsedBody.success) {
          return json(
            { error: "Invalid request body", issues: parsedBody.error.flatten() },
            400,
          );
        }

        const user = await requireCurrentUser(request);
        const id = parsedParams.data.id;
        const updates: Partial<typeof investments.$inferInsert> = {
          ...(parsedBody.data.name !== undefined && { name: parsedBody.data.name }),
          ...(parsedBody.data.investmentType !== undefined && { investmentType: parsedBody.data.investmentType }),
          ...(parsedBody.data.symbol !== undefined && { symbol: parsedBody.data.symbol ?? null }),
        };

        const [updated] = await db
          .update(investments)
          .set(updates)
          .where(and(eq(investments.id, id), eq(investments.userId, user.id)))
          .returning();

        if (!updated) {
          return json({ error: "Investment not found" }, 404);
        }

        return json({ investment: updated });
      },
      DELETE: async ({ request, params }) => {
        const parsedParams = investmentIdSchema.safeParse(params);

        if (!parsedParams.success) {
          return json({ error: "Invalid investment id" }, 400);
        }

        const user = await requireCurrentUser(request);
        const id = parsedParams.data.id;

        const [deleted] = await db
          .delete(investments)
          .where(and(eq(investments.id, id), eq(investments.userId, user.id)))
          .returning({ id: investments.id });

        if (!deleted) {
          return json({ error: "Investment not found" }, 404);
        }

        return json({ success: true });
      },
    },
  },
});
