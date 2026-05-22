import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db } from "#/db";
import { requireCurrentUser } from "#/lib/server-auth";
import { budgetPresets, presetAllocations } from "#/db/schema";

const createBudgetPresetSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  allocations: z.array(
    z.object({
      categoryGroupId: z.string().uuid().nullable().optional(),
      categoryId: z.string().uuid().nullable().optional(),
      allocatedAmount: z.coerce.number().min(0),
      allocationPercent: z.coerce.number().min(0).max(100).nullable().optional(),
    }).refine((val) => val.categoryGroupId || val.categoryId, {
      message: "Allocation must target a group or category",
    })
  ).min(1),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/budget-presets/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const presets = await db
          .select({
            id: budgetPresets.id,
            name: budgetPresets.name,
            description: budgetPresets.description,
            createdAt: budgetPresets.createdAt,
          })
          .from(budgetPresets)
          .where(eq(budgetPresets.userId, user.id))
          .orderBy(desc(budgetPresets.createdAt));

        const allocRows = await db
          .select({
            presetId: presetAllocations.presetId,
            id: presetAllocations.id,
            categoryGroupId: presetAllocations.categoryGroupId,
            categoryId: presetAllocations.categoryId,
            allocatedAmount: presetAllocations.allocatedAmount,
            allocationPercent: presetAllocations.allocationPercent,
          })
          .from(presetAllocations)
          .innerJoin(
            budgetPresets,
            eq(presetAllocations.presetId, budgetPresets.id)
          )
          .where(eq(budgetPresets.userId, user.id))
          .orderBy(desc(presetAllocations.id));

        const allocationsMap: Record<string, any[]> = {};
        for (const a of allocRows) {
          (allocationsMap[a.presetId] ||= []).push(a);
        }

        return json({
          presets: presets.map((p) => ({
            ...p,
            allocations: allocationsMap[p.id] || [],
          })),
        });
      },
      POST: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const payload = await request.json();
        const parsed = createBudgetPresetSchema.safeParse(payload);
        if (!parsed.success) {
          return json(
            { error: "Invalid request body", issues: parsed.error.flatten() },
            400
          );
        }
        const { name, description, allocations } = parsed.data;
        const result = await db.transaction(async (tx) => {
          const [preset] = await tx
            .insert(budgetPresets)
            .values({
              userId: user.id,
              name,
              description: description ?? "",
            })
            .returning();
          await tx.insert(presetAllocations).values(
            allocations.map((a) => ({
              presetId: preset.id,
              categoryGroupId: a.categoryGroupId ?? null,
              categoryId: a.categoryId ?? null,
              allocatedAmount: a.allocatedAmount,
              allocationPercent: a.allocationPercent ?? null,
            }))
          );
          return preset;
        });
        return json({ preset: result }, 201);
      },
    },
  },
});
