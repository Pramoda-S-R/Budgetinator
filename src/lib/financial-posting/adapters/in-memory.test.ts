import { describe, expect, it } from "vitest";

import { createInMemoryFinancialPostingAdapter } from "./in-memory";

describe("in-memory financial posting adapter", () => {
	it("rolls back state when a transaction callback throws", async () => {
		const adapter = createInMemoryFinancialPostingAdapter({
			accounts: [
				{ id: "acct-1", userId: "user-1", name: "Wallet", currentBalance: 100 },
			],
		});

		await expect(
			adapter.withTransaction(async (tx) => {
				await tx.applyBalanceAdjustments("user-1", [
					{ accountId: "acct-1", delta: -50 },
				]);
				throw new Error("force rollback");
			}),
		).rejects.toThrow("force rollback");

		const state = adapter.inspectState();
		expect(state.accounts.get("acct-1")?.currentBalance).toBe(100);
		expect(state.accountBalanceHistory).toHaveLength(0);
	});
});
