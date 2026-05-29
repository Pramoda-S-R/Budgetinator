import { describe, expect, it } from "vitest";

import { normalizeTags, serializeTransaction } from "./-helpers";

describe("normalizeTags", () => {
	it("trims entries and removes duplicates or empty strings", () => {
		expect(normalizeTags([" rent ", "", "rent", "food"])).toEqual([
			"rent",
			"food",
		]);
		expect(normalizeTags([])).toEqual([]);
	});
});

describe("serializeTransaction", () => {
	it("formats dates and attaches tags to the response", () => {
		const row = {
			id: "tx-1",
			userId: "u-1",
			accountId: "acc-1",
			transferAccountId: "acc-2",
			categoryId: "cat-1",
			accountName: "Primary",
			transferAccountName: "Savings",
			categoryName: "Utilities",
			amount: "250.00",
			transactionType: "expense",
			merchant: "Utility Co",
			notes: "Monthly bill",
			isRecurring: false,
			transactionDate: new Date("2024-01-01T10:00:00.000Z"),
			createdAt: new Date("2024-01-01T11:00:00.000Z"),
		} satisfies Parameters<typeof serializeTransaction>[0];

		const tags = ["utilities"];
		const serialized = serializeTransaction(row, tags);

		expect(serialized).toEqual({
			id: "tx-1",
			accountId: "acc-1",
			transferAccountId: "acc-2",
			categoryId: "cat-1",
			accountName: "Primary",
			transferAccountName: "Savings",
			categoryName: "Utilities",
			amount: "250.00",
			transactionType: "expense",
			merchant: "Utility Co",
			notes: "Monthly bill",
			tags,
			isRecurring: false,
			transactionDate: "2024-01-01T10:00:00.000Z",
			createdAt: "2024-01-01T11:00:00.000Z",
		});
	});
});
