import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { SignUp } from '#/components/shared/auth/sign-up'

const authRedirectSchema = z.object({
  redirectTo: z.string().optional(),
})

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUpPage,
  validateSearch: authRedirectSchema,
})

function SignUpPage() {
  const { redirectTo } = Route.useSearch()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp redirectTo={redirectTo} />
    </div>
  )
}
