import type { InvestmentEntry } from "#/db/schema";

// `InvestmentValuation` no longer maps to a table — it's now the shape served
// by `/api/investment-valuations`, which projects `account_balance_history`
// rows for an investment's paired account.
type InvestmentValuation = {
  investmentId: string;
  valuationAmount: string | number;
};

/**
 * Calculate gain/loss per investment based on entries and latest valuation.
 * Returns array of records with invested amount, current value, and gain/loss.
 */
export function calculateGainLoss(
  entries: InvestmentEntry[],
  valuations: InvestmentValuation[],
): Array<{
  investmentId: string;
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
}> {
  const investedMap = new Map<string, number>();
  for (const e of entries) {
    const prev = investedMap.get(e.investmentId) ?? 0;
    investedMap.set(e.investmentId, prev + parseFloat(e.amountInvested));
  }
  return valuations.map((v) => {
    const totalInvested = investedMap.get(v.investmentId) ?? 0;
    const currentValue = Number(v.valuationAmount);
    return {
      investmentId: v.investmentId,
      totalInvested,
      currentValue,
      gainLoss: currentValue - totalInvested,
    };
  });
}

/**
 * Calculate portfolio allocation percentages based on latest valuations.
 * Returns array of records with investmentId and allocation percent.
 */
export function calculatePortfolioAllocation(
  valuations: InvestmentValuation[],
): Array<{ investmentId: string; allocationPercent: number }> {
  const values = valuations.map((v) => Number(v.valuationAmount));
  const total = values.reduce((sum, v) => sum + v, 0);
  return valuations.map((v) => {
    const value = Number(v.valuationAmount);
    return {
      investmentId: v.investmentId,
      allocationPercent: total > 0 ? (value / total) * 100 : 0,
    };
  });
}
