import { createFileRoute } from '@tanstack/react-router'

import { proxyNeonAuth } from '#/lib/neon-auth-proxy'

export const Route = createFileRoute('/auth/signup')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return proxyNeonAuth(request, '/sign-up/email')
      },
    },
  },
})
