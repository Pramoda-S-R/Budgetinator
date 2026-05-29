import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { fetchNeonSessionUser } from "#/lib/neon-auth-session.server";

export const getServerSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const sessionUser = await fetchNeonSessionUser(request);

		if (!sessionUser) {
			return null;
		}

		return { id: sessionUser.id };
	},
);
