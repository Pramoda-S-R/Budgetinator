import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { authClient } from '#/auth'

export const Route = createFileRoute('/auth/sign-out')({
  component: SignOutPage,
})

function SignOutPage() {
  const navigate = useNavigate()

  useEffect(() => {
    authClient.signOut().finally(() => {
      navigate({ to: '/' })
    })
  }, [navigate])

  return <div className="flex min-h-screen items-center justify-center">Signing out...</div>
}
