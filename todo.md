# Todo

The following audit fixes are planned:

- [x] Rename/move server functions & server-only modules to `.functions.ts`/`.server.ts`
- [x] Centralize and validate environment variables in `lib/env.functions.ts`
- [x] Implement CSRF protection and configure global request + function middleware
- [x] Refactor API routes to use built-in `Response.json`, loader functions, and consistent error handling
- [x] Enable SSR streaming and static prerendering in `vite.config.ts`
- [ ] Configure session cookies (`HttpOnly`, `Secure`, `SameSite`), session expiry, and token validation
