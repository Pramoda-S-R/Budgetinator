import { authClient } from '#/auth';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ location }) => {
    const {pathname} = location;
    const { data } = await authClient.getSession();
    if (!data?.session) {
      const searchParams = new URLSearchParams({"redirectTo": pathname});
      throw redirect({ to: `/auth/sign-in?${searchParams.toString()}` });
    }
  },
  component: Outlet,
})
