import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { budgetPresets } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const idSchema = z.object({ id: z.string().uuid() });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/budget-presets/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const parsedParams = idSchema.safeParse(params);
        if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

        const user = await requireCurrentUser(request);

        const [row] = await db
          .select({ id: budgetPresets.id })
          .from(budgetPresets)
          .where(and(eq(budgetPresets.id, parsedParams.data.id), eq(budgetPresets.userId, user.id)))
          .limit(1);

        if (!row) return json({ error: "Preset not found" }, 404);

        await db.delete(budgetPresets).where(eq(budgetPresets.id, parsedParams.data.id));

        return json({ success: true });
      },
    },
  },
});
