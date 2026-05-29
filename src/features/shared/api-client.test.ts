import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import {
	ApiRequestError,
	createApiClient,
	unwrapApiResult,
} from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

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

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("createApiClient", () => {
	test("returns ok result with decoded payload", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ value: 42 }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const schema = z.object({ value: z.number() });
		const client = createApiClient(sampleUser);
		const result = await client.get("/api/test", schema);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data).toEqual({ value: 42 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(init.credentials).toBe("same-origin");
	});

	test("returns http error result with status and issues", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					error: "Invalid request body",
					issues: { fieldErrors: { amount: ["Required"] } },
				}),
				{ status: 400, headers: { "content-type": "application/json" } },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createApiClient(sampleUser);
		const result = await client.get("/api/test", z.object({ ok: z.boolean() }));

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.error.kind).toBe("http");
		expect(result.error.status).toBe(400);
		expect(result.error.message).toBe("Invalid request body");
		expect(result.error.issues).toEqual({
			fieldErrors: { amount: ["Required"] },
		});
	});

	test("returns decode error result when payload does not match schema", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ amount: "42" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createApiClient(sampleUser);
		const result = await client.get(
			"/api/test",
			z.object({ amount: z.number() }),
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.error.kind).toBe("decode");
		expect(result.error.message).toBe("Response decode failed");
		expect(Array.isArray(result.error.issues)).toBe(true);
	});

	test("returns network error result when fetch throws", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("socket closed"));
		vi.stubGlobal("fetch", fetchMock);

		const client = createApiClient(sampleUser);
		const result = await client.get("/api/test", z.object({ ok: z.boolean() }));

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.error.kind).toBe("network");
		expect(result.error.message).toBe("Network request failed");
	});
});

describe("unwrapApiResult", () => {
	test("throws ApiRequestError for failed result", () => {
		expect(() =>
			unwrapApiResult({
				ok: false,
				error: {
					kind: "http",
					endpoint: "/api/test",
					status: 401,
					message: "Unauthorized",
				},
			}),
		).toThrow(ApiRequestError);
	});
});
