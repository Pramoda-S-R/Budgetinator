import { describe, expect, it } from "vitest";
import {
  calculateGainLoss,
  calculatePortfolioAllocation,
} from "./investment-analytics";

describe("calculateGainLoss", () => {
  it("computes correct invested, current and gain/loss values", () => {
    const entries = [
      { investmentId: "inv1", amountInvested: "100", units: null, investedAt: new Date(), notes: "" },
      { investmentId: "inv1", amountInvested: "50", units: null, investedAt: new Date(), notes: "" },
      { investmentId: "inv2", amountInvested: "200", units: null, investedAt: new Date(), notes: "" },
    ];
    const valuations = [
      { investmentId: "inv1", valuationAmount: "180", valuationDate: new Date() },
      { investmentId: "inv2", valuationAmount: "210", valuationDate: new Date() },
    ];
    const result = calculateGainLoss(entries as any, valuations as any);
    expect(result).toEqual([
      { investmentId: "inv1", totalInvested: 150, currentValue: 180, gainLoss: 30 },
      { investmentId: "inv2", totalInvested: 200, currentValue: 210, gainLoss: 10 },
    ]);
  });
});

describe("calculatePortfolioAllocation", () => {
  it("computes allocation percentages that sum to 100", () => {
    const valuations = [
      { investmentId: "invA", valuationAmount: "100", valuationDate: new Date() },
      { investmentId: "invB", valuationAmount: "300", valuationDate: new Date() },
    ];
    const allocations = calculatePortfolioAllocation(valuations as any);
    // invA: 25%, invB: 75%
    expect(allocations).toEqual([
      { investmentId: "invA", allocationPercent: 25 },
      { investmentId: "invB", allocationPercent: 75 },
    ]);
    const total = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
    expect(total).toBeCloseTo(100);
  });
});
