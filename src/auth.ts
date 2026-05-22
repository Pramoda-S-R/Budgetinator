import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react";

// In the browser: route through the app's own /api/auth proxy so that
// session cookies are set on the app domain and server-side checks work.
// On the server (SSR): call Neon Auth directly (server-to-server).
const authBaseUrl =
	typeof window !== "undefined"
		? `${window.location.origin}/api/auth`
		: (import.meta.env.VITE_NEON_AUTH_URL as string);

export const authClient = createAuthClient(authBaseUrl, {
	adapter: BetterAuthReactAdapter(),
});
