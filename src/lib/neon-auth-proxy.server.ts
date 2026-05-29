const AUTH_HEADER_ALLOWLIST = ["content-type", "cookie", "origin", "referer"];

import { env } from "#/lib/env.functions";

export function getNeonAuthBaseUrl() {
  return env.VITE_NEON_AUTH_URL.replace(/\/$/, "");
}

function buildHeaders(requestHeaders: Headers) {
	const headers = new Headers();

	for (const headerName of AUTH_HEADER_ALLOWLIST) {
		const value = requestHeaders.get(headerName);
		if (value) {
			headers.set(headerName, value);
		}
	}

	return headers;
}

// path must start with '/', e.g. '/sign-in/email' or '/get-session?foo=bar'
export async function proxyNeonAuth(request: Request, path: string) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const upstreamUrl = `${getNeonAuthBaseUrl()}${normalizedPath}`;

	const body =
		request.method === "GET" || request.method === "HEAD"
			? undefined
			: await request.text();

	const upstreamResponse = await fetch(upstreamUrl, {
		method: request.method,
		headers: buildHeaders(request.headers),
		body,
	});

	const headers = new Headers();
	const contentType = upstreamResponse.headers.get("content-type");
	const setCookie = upstreamResponse.headers.get("set-cookie");

	if (contentType) headers.set("content-type", contentType);
	if (setCookie) headers.set("set-cookie", setCookie);

	return new Response(upstreamResponse.body, {
		status: upstreamResponse.status,
		headers,
	});
}
