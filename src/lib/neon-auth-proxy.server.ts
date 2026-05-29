const FORWARDED_AUTH_HEADERS = [
	"accept",
	"content-type",
	"cookie",
	"origin",
	"referer",
];

function getRequiredAuthUrl() {
	const authUrl = import.meta.env.VITE_NEON_AUTH_URL;

	if (!authUrl) {
		throw new Error("Missing VITE_NEON_AUTH_URL for Neon Auth proxy");
	}

	return authUrl;
}

export function getNeonAuthBaseUrl() {
	return getRequiredAuthUrl().replace(/\/$/, "");
}

function buildHeaders(requestHeaders: Headers) {
	const headers = new Headers();

	for (const headerName of FORWARDED_AUTH_HEADERS) {
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
	const setCookieValues = (
		upstreamResponse.headers as Headers & { getSetCookie?: () => string[] }
	).getSetCookie?.();
	const setCookieFallback = upstreamResponse.headers.get("set-cookie");

	if (contentType) headers.set("content-type", contentType);

	if (setCookieValues && setCookieValues.length > 0) {
		for (const cookie of setCookieValues) {
			headers.append("set-cookie", cookie);
		}
	} else if (setCookieFallback) {
		headers.append("set-cookie", setCookieFallback);
	}

	return new Response(upstreamResponse.body, {
		status: upstreamResponse.status,
		headers,
	});
}
