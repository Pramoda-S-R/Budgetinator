import AuthView from '#/components/shared/auth-view';
import { createFileRoute } from '@tanstack/react-router';
import {z} from "zod";

const authRedirectSchema = z.object({
  redirectTo: z.string().optional(),
});

export const Route = createFileRoute('/auth/$pathname')({
  component: Auth,
  validateSearch: authRedirectSchema,
});

function Auth() {
  const { redirectTo } = Route.useSearch();
  const { pathname } = Route.useParams();
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <AuthView pathname={pathname} redirectTo={redirectTo} />
    </div>
  );
}
