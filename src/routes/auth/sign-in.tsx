import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { SignIn } from '#/components/shared/auth/sign-in'

const authRedirectSchema = z.object({
  redirectTo: z.string().optional(),
})

export const Route = createFileRoute('/auth/sign-in')({
  component: SignInPage,
  validateSearch: authRedirectSchema,
})

function SignInPage() {
  const { redirectTo } = Route.useSearch()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn redirectTo={redirectTo} />
    </div>
  )
}
