import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { db } from '#/db'
import { users } from '#/db/schema'
import { requireCurrentUser } from '#/lib/server-auth'

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    currencyCode: z.string().trim().min(3).max(3).optional(),
    timezone: z.string().trim().min(1).optional(),
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

export const Route = createFileRoute('/api/profile/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request)

        return json({
          profile: {
            id: user.id,
            email: user.email,
            name: user.name,
            currencyCode: user.currencyCode,
            timezone: user.timezone,
          },
        })
      },
      PATCH: async ({ request }) => {
        const user = await requireCurrentUser(request)
        const payload = await request.json()
        const parsed = updateProfileSchema.safeParse(payload)

        if (!parsed.success) {
          return json({ error: 'Invalid request body', issues: parsed.error.flatten() }, 400)
        }

        const updates = {
          ...('name' in parsed.data ? { name: parsed.data.name } : {}),
          ...('currencyCode' in parsed.data
            ? { currencyCode: parsed.data.currencyCode?.toUpperCase() }
            : {}),
          ...('timezone' in parsed.data ? { timezone: parsed.data.timezone } : {}),
        }

        const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning()

        if (!updated) {
          return json({ error: 'Profile not found' }, 404)
        }

        return json({
          profile: {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            currencyCode: updated.currencyCode,
            timezone: updated.timezone,
          },
        })
      },
    },
  },
})
