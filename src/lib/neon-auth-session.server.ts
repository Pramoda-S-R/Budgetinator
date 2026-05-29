import { getNeonAuthBaseUrl } from "#/lib/neon-auth-proxy.server";

export type SessionUser = {
	id: string;
	email?: string | null;
	name?: string | null;
};

function toSessionUser(value: unknown): SessionUser | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}

	const payload = value as Record<string, unknown>;
	const id = payload.id;

	if (typeof id !== "string" || id.length === 0) {
		return null;
	}

	return {
		id,
		email: typeof payload.email === "string" ? payload.email : null,
		name: typeof payload.name === "string" ? payload.name : null,
	};
}

function extractSessionUser(payload: unknown): SessionUser | null {
	if (typeof payload !== "object" || payload === null) {
		return null;
	}

	const sessionPayload = payload as {
		user?: unknown;
		data?: { user?: unknown };
		session?: { user?: unknown };
	};

	return (
		toSessionUser(sessionPayload.user) ??
		toSessionUser(sessionPayload.data?.user) ??
		toSessionUser(sessionPayload.session?.user)
	);
}

export async function fetchNeonSessionUser(
	request: Request,
): Promise<SessionUser | null> {
	try {
		const response = await fetch(`${getNeonAuthBaseUrl()}/get-session`, {
			method: "GET",
			headers: { cookie: request.headers.get("cookie") ?? "" },
		});

		if (!response.ok) {
			return null;
		}

		const payload = (await response.json()) as unknown;
		return extractSessionUser(payload);
	} catch {
		return null;
	}
}
