import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react";

const AUTH_PROXY_PATH = "/api/auth";

function trimTrailingSlash(value: string): string {
	return value.replace(/\/$/, "");
}

function resolveAuthBaseUrl(): string {
	if (typeof window !== "undefined") {
		return `${window.location.origin}${AUTH_PROXY_PATH}`;
	}

	const serverAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
	if (!serverAuthUrl) {
		throw new Error("Missing VITE_NEON_AUTH_URL for server-side Neon Auth");
	}

	return trimTrailingSlash(serverAuthUrl);
}

export const authClient = createAuthClient(resolveAuthBaseUrl(), {
	adapter: BetterAuthReactAdapter(),
});
