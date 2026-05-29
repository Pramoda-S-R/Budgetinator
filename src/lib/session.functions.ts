import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getNeonAuthBaseUrl } from "#/lib/neon-auth-proxy";

export const getServerSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();

		try {
			const url = `${getNeonAuthBaseUrl()}/get-session`;
			const response = await fetch(url, {
				method: "GET",
				headers: { cookie: request.headers.get("cookie") ?? "" },
			});

			if (!response.ok) return null;

			const payload = (await response.json()) as {
				user?: { id: string } | null;
				data?: { user?: { id: string } | null };
			};

			return payload.user ?? payload.data?.user ?? null;
		} catch {
			return null;
		}
	},
);
