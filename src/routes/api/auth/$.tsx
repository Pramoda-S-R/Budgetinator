import { createFileRoute } from "@tanstack/react-router";
import { proxyNeonAuth } from "#/lib/neon-auth-proxy";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => forwardToNeonAuth(request),
			POST: ({ request }) => forwardToNeonAuth(request),
			PUT: ({ request }) => forwardToNeonAuth(request),
			PATCH: ({ request }) => forwardToNeonAuth(request),
			DELETE: ({ request }) => forwardToNeonAuth(request),
		},
	},
});

function forwardToNeonAuth(request: Request) {
	const url = new URL(request.url);
	// Strip '/api/auth' prefix and forward the rest (including query string) to Neon Auth
	const path = url.pathname.replace(/^\/api\/auth/, "") + url.search;
	return proxyNeonAuth(request, path || "/");
}
