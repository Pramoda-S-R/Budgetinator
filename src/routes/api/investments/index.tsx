import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investments } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const createInvestmentSchema = z.object({
  name: z.string().trim().min(1),
  investmentType: z.string().trim().min(1),
  symbol: z.string().trim().nullable().optional(),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/investments/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const rows = await db
          .select()
          .from(investments)
          .where(eq(investments.userId, user.id))
          .orderBy(desc(investments.createdAt));
        return json({ investments: rows });
      },
      POST: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const payload = await request.json();
        const parsed = createInvestmentSchema.safeParse(payload);

        if (!parsed.success) {
          return json(
            { error: "Invalid request body", issues: parsed.error.flatten() },
            400,
          );
        }

        const values = parsed.data;
        const [created] = await db
          .insert(investments)
          .values({
            userId: user.id,
            name: values.name,
            investmentType: values.investmentType,
            symbol: values.symbol ?? null,
          })
          .returning();

        return json({ investment: created }, 201);
      },
    },
  },
});
