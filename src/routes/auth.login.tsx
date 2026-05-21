import { createFileRoute } from '@tanstack/react-router'

import { proxyNeonAuth } from '#/lib/neon-auth-proxy'

export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return proxyNeonAuth(request, '/sign-in/email')
      },
    },
  },
})
