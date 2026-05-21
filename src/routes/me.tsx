import { createFileRoute } from '@tanstack/react-router'

import { proxyNeonAuth } from '#/lib/neon-auth-proxy'

export const Route = createFileRoute('/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return proxyNeonAuth(request, '/get-session')
      },
    },
  },
})
