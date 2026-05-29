import { createMiddleware } from '@tanstack/react-start';
import { randomUUID } from 'crypto';

const CSRF_TOKEN_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * CSRF protection middleware.
 * - On GET/HEAD: set or maintain a CSRF token cookie.
 * - On other methods: verify header token matches cookie.
 */
export const csrfMiddleware = createMiddleware()
  .server(async ({ request, next }) => {
    const method = request.method;

    if (method === 'GET' || method === 'HEAD') {
      const cookieHeader = request.headers.get('cookie') ?? '';
      const existing =
        cookieHeader.match(new RegExp(`${CSRF_TOKEN_NAME}=([^;]+)`))?.[1];
      const token = existing ?? randomUUID();
      const response = await next();
      response.headers.set(
        'set-cookie',
        `${CSRF_TOKEN_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax;`
      );
      return response;
    }

    const cookieHeader = request.headers.get('cookie') ?? '';
    const cookieToken = cookieHeader.match(
      new RegExp(`${CSRF_TOKEN_NAME}=([^;]+)`),
    )?.[1];
    const headerToken = request.headers.get(CSRF_HEADER_NAME);

    if (!cookieToken || cookieToken !== headerToken) {
      return new Response('Invalid CSRF token', { status: 403 });
    }

    return next();
  });
