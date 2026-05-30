import { randomUUID } from "node:crypto";
import { createMiddleware } from "@tanstack/react-start";

const CSRF_TOKEN_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";
const EXCLUDED_PATH_PREFIXES = ["/api/auth"];

function readCookie(cookieHeader: string, name: string): string | undefined {
	return cookieHeader
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function shouldSkipCsrfCheck(pathname: string): boolean {
	return EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function buildCsrfCookie(token: string, request: Request): string {
	const url = new URL(request.url);
	const forwardedProto = request.headers.get("x-forwarded-proto");
	const isSecure = url.protocol === "https:" || forwardedProto === "https";
	const secure = isSecure ? " Secure;" : "";

	return `${CSRF_TOKEN_NAME}=${token}; Path=/; SameSite=Lax;${secure}`;
}

/**
 * CSRF protection middleware.
 * - On GET/HEAD: set or maintain a CSRF token cookie.
 * - On other methods: verify header token matches cookie.
 */
export const csrfMiddleware = createMiddleware().server(
	async ({ request, next }) => {
		const method = request.method;
		const pathname = new URL(request.url).pathname;
		const cookieHeader = request.headers.get("cookie") ?? "";

		if (method === "GET" || method === "HEAD") {
			const existing = readCookie(cookieHeader, CSRF_TOKEN_NAME);
			const token = existing ?? randomUUID();
			const result = await next();

			if (!existing) {
				result.response.headers.append(
					"set-cookie",
					buildCsrfCookie(token, request),
				);
			}

			return result;
		}

		if (shouldSkipCsrfCheck(pathname)) {
			return next();
		}

		const cookieToken = readCookie(cookieHeader, CSRF_TOKEN_NAME);
		const headerToken = request.headers.get(CSRF_HEADER_NAME);

		if (!cookieToken || cookieToken !== headerToken) {
			return new Response("Invalid CSRF token", { status: 403 });
		}

		return next();
	},
);
