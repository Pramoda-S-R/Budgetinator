import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ApiRequestError } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

import { fetchAccounts } from "./data-access";

const sampleUser: User = {
	id: "user-123",
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	email: "user@example.com",
	emailVerified: true,
	name: "Test User",
	image: null,
	banned: null,
	role: null,
	banReason: null,
	banExpires: null,
};

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("accounts React Query seam", () => {
	test("caches successful decoded accounts response", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					accounts: [],
					totalNetWorth: "0",
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const queryClient = createQueryClient();
		const queryKey = ["accounts", sampleUser.id] as const;

		const data = await queryClient.fetchQuery({
			queryKey,
			queryFn: () => fetchAccounts(sampleUser),
		});

		expect(data).toEqual({ accounts: [], totalNetWorth: "0" });
		expect(queryClient.getQueryState(queryKey)?.status).toBe("success");
	});

	test("propagates ApiRequestError through query error state", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const queryClient = createQueryClient();
		const queryKey = ["accounts", sampleUser.id] as const;

		await expect(
			queryClient.fetchQuery({
				queryKey,
				queryFn: () => fetchAccounts(sampleUser),
			}),
		).rejects.toBeInstanceOf(ApiRequestError);

		const state = queryClient.getQueryState(queryKey);
		expect(state?.status).toBe("error");
		expect(state?.error).toBeInstanceOf(ApiRequestError);
	});
});
