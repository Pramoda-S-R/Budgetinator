import { eq } from 'drizzle-orm'

import { db } from '#/db'
import { users } from '#/db/schema'

type SessionUser = {
  id: string
  email?: string | null
  name?: string | null
}

function getNeonAuthBaseUrl() {
  const authUrl = process.env.VITE_NEON_AUTH_URL ?? import.meta.env.VITE_NEON_AUTH_URL

  if (!authUrl) {
    throw new Error('VITE_NEON_AUTH_URL is required')
  }

  return authUrl
}

async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const url = new URL('/get-session', getNeonAuthBaseUrl())
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: request.headers.get('cookie') ?? '',
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    user?: SessionUser
    data?: { user?: SessionUser }
  }

  return payload.user ?? payload.data?.user ?? null
}

export async function requireCurrentUser(request: Request) {
  const sessionUser = await getSessionUser(request)

  if (!sessionUser?.id) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const name = sessionUser.name?.trim() || sessionUser.email || 'Budgetinator User'
  const email = sessionUser.email ?? `${sessionUser.id}@local.budgetinator.dev`

  await db
    .insert(users)
    .values({
      id: sessionUser.id,
      email,
      name,
      currencyCode: 'USD',
      timezone: 'UTC',
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        name,
      },
    })

  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1)

  if (!user) {
    throw new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  return user
}
