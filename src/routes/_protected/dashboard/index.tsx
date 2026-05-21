import { UserButton } from '@neondatabase/neon-js/auth/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/"! <UserButton size="icon" /></div>
}
