import { describe, expect, it } from "vitest";
import {
	calculateGainLoss,
	calculatePortfolioAllocation,
	type InvestmentValuation,
} from "./investment-analytics";

type TestInvestmentEntry = {
	investmentId: string;
	amountInvested: string;
};

describe("calculateGainLoss", () => {
	it("computes correct invested, current and gain/loss values", () => {
		const entries: TestInvestmentEntry[] = [
			{ investmentId: "inv1", amountInvested: "100" },
			{ investmentId: "inv1", amountInvested: "50" },
			{ investmentId: "inv2", amountInvested: "200" },
		];
		const valuations: InvestmentValuation[] = [
			{ investmentId: "inv1", valuationAmount: "180" },
			{ investmentId: "inv2", valuationAmount: "210" },
		];
		const result = calculateGainLoss(entries, valuations);
		expect(result).toEqual([
			{
				investmentId: "inv1",
				totalInvested: 150,
				currentValue: 180,
				gainLoss: 30,
			},
			{
				investmentId: "inv2",
				totalInvested: 200,
				currentValue: 210,
				gainLoss: 10,
			},
		]);
	});
});

describe("calculatePortfolioAllocation", () => {
	it("computes allocation percentages that sum to 100", () => {
		const valuations: InvestmentValuation[] = [
			{ investmentId: "invA", valuationAmount: "100" },
			{ investmentId: "invB", valuationAmount: "300" },
		];
		const allocations = calculatePortfolioAllocation(valuations);
		// invA: 25%, invB: 75%
		expect(allocations).toEqual([
			{ investmentId: "invA", allocationPercent: 25 },
			{ investmentId: "invB", allocationPercent: 75 },
		]);
		const total = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
		expect(total).toBeCloseTo(100);
	});
});
