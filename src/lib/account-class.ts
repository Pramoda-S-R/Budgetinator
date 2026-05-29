// Account-type classification used by analytics and ledger code.
//
// CASH    — real spendable money: bank, cash, wallet, salary
// ASSET   — owed to you or held as investment: investment, loan_given
// LIABILITY — what you owe: loan_taken, emi, credit_card
//
// The ledger treats a movement between a CASH account and an ASSET or
// LIABILITY account as a "capital flow" rather than ordinary income/expense,
// so the cashflow chart can surface EMI, loan and investment activity
// separately from regular spending.

export const CASH_TYPES = ["bank", "cash", "wallet", "salary"] as const;
export const ASSET_TYPES = ["investment", "loan_given"] as const;
export const LIABILITY_TYPES = ["loan_taken", "emi", "credit_card"] as const;

export type AccountClass = "cash" | "asset" | "liability";

export function classifyAccount(accountType: string): AccountClass {
	if ((LIABILITY_TYPES as readonly string[]).includes(accountType)) return "liability";
	if ((ASSET_TYPES as readonly string[]).includes(accountType)) return "asset";
	return "cash";
}

// Used as the default `name` when auto-creating an account paired with a
// loan / EMI / investment.
export function pairedAccountName(opts: {
	kind: "loan_given" | "loan_taken" | "emi" | "investment";
	label: string;
}): string {
	switch (opts.kind) {
		case "loan_given":
			return `Loan to ${opts.label}`;
		case "loan_taken":
			return `Loan from ${opts.label}`;
		case "emi":
			return `EMI: ${opts.label}`;
		case "investment":
			return opts.label;
	}
}
