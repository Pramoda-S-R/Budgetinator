import { createStart } from '@tanstack/react-start/server';
import { csrfMiddleware } from '#/lib/middleware/csrf';

export default createStart({
  requestMiddleware: [csrfMiddleware],
  functionMiddleware: [csrfMiddleware],
});
