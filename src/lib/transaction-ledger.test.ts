import { describe, expect, it } from "vitest";

import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	transactionTypes,
} from "./transaction-ledger";

describe("transaction ledger helpers", () => {
	it("produces a single delta for income", () => {
		const [delta] = buildTransactionDeltas({
			transactionType: "income",
			amount: 100,
			accountId: "acct-1",
		});

		expect(delta).toEqual({ accountId: "acct-1", delta: 100 });
	});

	it("produces a single delta for expenses", () => {
		const [delta] = buildTransactionDeltas({
			transactionType: "expense",
			amount: 42.75,
			accountId: "acct-2",
		});

		expect(delta).toEqual({ accountId: "acct-2", delta: -42.75 });
	});

	it("builds opposite deltas for transfer transactions", () => {
		const deltas = buildTransactionDeltas({
			transactionType: "transfer",
			amount: 18,
			accountId: "acct-1",
			transferAccountId: "acct-2",
		});

		expect(deltas).toEqual([
			{ accountId: "acct-1", delta: -18 },
			{ accountId: "acct-2", delta: 18 },
		]);
	});

	it("combines multiple deltas for the same account", () => {
		const combined = combineAccountDeltas([
			{ accountId: "acct-1", delta: -100 },
			{ accountId: "acct-1", delta: 25 },
			{ accountId: "acct-2", delta: 10 },
		]);

		expect(combined).toEqual([
			{ accountId: "acct-1", delta: -75 },
			{ accountId: "acct-2", delta: 10 },
		]);
	});

	it("inverts deltas correctly", () => {
		expect(invertDeltas([{ accountId: "acct-1", delta: -55 }])).toEqual([
			{ accountId: "acct-1", delta: 55 },
		]);
	});

	it("includes the three recognized transaction types", () => {
		expect(transactionTypes).toEqual(["expense", "income", "transfer"]);
	});
});
