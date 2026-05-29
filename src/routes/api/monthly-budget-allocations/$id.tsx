import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { monthlyBudgetAllocations, monthlyBudgets } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const idSchema = z.object({ id: z.string().uuid() });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/monthly-budget-allocations/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const parsedParams = idSchema.safeParse(params);
        if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

        const user = await requireCurrentUser(request);
        const payload = await request.json();
        const parsed = z.object({ allocatedAmount: z.coerce.number().min(0) }).safeParse(payload);
        if (!parsed.success) return json({ error: "Invalid body" }, 400);

        const [row] = await db
          .select({ alloc: monthlyBudgetAllocations })
          .from(monthlyBudgetAllocations)
          .innerJoin(monthlyBudgets, eq(monthlyBudgetAllocations.monthlyBudgetId, monthlyBudgets.id))
          .where(and(eq(monthlyBudgetAllocations.id, parsedParams.data.id), eq(monthlyBudgets.userId, user.id)))
          .limit(1);

        if (!row) return json({ error: "Allocation not found" }, 404);

        const [updated] = await db
          .update(monthlyBudgetAllocations)
          .set({ allocatedAmount: parsed.data.allocatedAmount.toFixed(2) })
          .where(eq(monthlyBudgetAllocations.id, parsedParams.data.id))
          .returning();

        return json({ allocation: updated });
      },

      DELETE: async ({ request, params }) => {
        const parsedParams = idSchema.safeParse(params);
        if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

        const user = await requireCurrentUser(request);

        const [row] = await db
          .select({ alloc: monthlyBudgetAllocations })
          .from(monthlyBudgetAllocations)
          .innerJoin(monthlyBudgets, eq(monthlyBudgetAllocations.monthlyBudgetId, monthlyBudgets.id))
          .where(and(eq(monthlyBudgetAllocations.id, parsedParams.data.id), eq(monthlyBudgets.userId, user.id)))
          .limit(1);

        if (!row) return json({ error: "Allocation not found" }, 404);

        await db.delete(monthlyBudgetAllocations).where(eq(monthlyBudgetAllocations.id, parsedParams.data.id));

        return json({ success: true });
      },
    },
  },
});
