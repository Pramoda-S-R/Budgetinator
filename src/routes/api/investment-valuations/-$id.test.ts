import { describe, test } from "vitest";

describe("PATCH /api/investment-valuations/$id", () => {
	test.todo("updates valuationAmount or valuationDate");
	test.todo("returns 404 if valuation not found or not owned");
	test.todo("returns 400 for invalid request body");
});

describe("DELETE /api/investment-valuations/$id", () => {
	test.todo("deletes valuation owned by the user");
	test.todo("returns 404 for invalid id or not owned");
});
