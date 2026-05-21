import { and, eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { db } from '#/db'
import { categories, categoryGroups } from '#/db/schema'
import { requireCurrentUser } from '#/lib/server-auth'

const categoryIdSchema = z.object({ id: z.string().uuid() })

const updateCategorySchema = z
  .object({
    groupId: z.string().uuid().optional(),
    name: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    color: z.string().trim().min(1).optional(),
    transactionType: z.string().trim().min(1).optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/categories/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const parsedParams = categoryIdSchema.safeParse(params)

        if (!parsedParams.success) {
          return json({ error: 'Invalid category id' }, 400)
        }

        const payload = await request.json()
        const parsedBody = updateCategorySchema.safeParse(payload)

        if (!parsedBody.success) {
          return json({ error: 'Invalid request body', issues: parsedBody.error.flatten() }, 400)
        }

        const user = await requireCurrentUser(request)

        if (parsedBody.data.groupId) {
          const [targetGroup] = await db
            .select({ id: categoryGroups.id })
            .from(categoryGroups)
            .where(and(eq(categoryGroups.id, parsedBody.data.groupId), eq(categoryGroups.userId, user.id)))
            .limit(1)

          if (!targetGroup) {
            return json({ error: 'Category group not found' }, 404)
          }
        }

        const [updated] = await db
          .update(categories)
          .set(parsedBody.data)
          .where(and(eq(categories.id, parsedParams.data.id), eq(categories.userId, user.id)))
          .returning()

        if (!updated) {
          return json({ error: 'Category not found' }, 404)
        }

        return json({ category: updated })
      },
      DELETE: async ({ request, params }) => {
        const parsedParams = categoryIdSchema.safeParse(params)

        if (!parsedParams.success) {
          return json({ error: 'Invalid category id' }, 400)
        }

        const user = await requireCurrentUser(request)

        const [deleted] = await db
          .delete(categories)
          .where(and(eq(categories.id, parsedParams.data.id), eq(categories.userId, user.id)))
          .returning({ id: categories.id })

        if (!deleted) {
          return json({ error: 'Category not found' }, 404)
        }

        return json({ success: true })
      },
    },
  },
})
