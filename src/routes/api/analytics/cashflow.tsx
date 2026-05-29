import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";

import { db } from "#/db";
import { accounts, transactions } from "#/db/schema";
import { ASSET_TYPES, CASH_TYPES, LIABILITY_TYPES } from "#/lib/account-class";
import { requireCurrentUser } from "#/lib/server-auth";

type SqlRows<T> = { rows: T[] };

type CashflowSqlRow = {
	year: number;
	month: number;
	income: string;
	expense: string;
	capitalInflow: string;
	capitalOutflow: string;
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

// We surface FOUR buckets so the EMI / loan / investment activity the user
// asked for is no longer invisible:
//   income          — type='income' on cash account
//   expense         — type='expense' on cash account
//   capitalInflow   — transfer cash←asset (sold/repaid) OR cash←liability (new debt)
//   capitalOutflow  — transfer cash→asset (invested/lent) OR cash→liability (debt repaid)
//
// Transfers strictly *between* two cash accounts are excluded from every
// bucket — they're internal moves, not cash flow.
export const Route = createFileRoute("/api/analytics/cashflow")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const url = new URL(request.url);
				const months = Math.min(
					Number(url.searchParams.get("months") ?? "12"),
					24,
				);

				const cashList = sql.raw(CASH_TYPES.map((t) => `'${t}'`).join(", "));
				const nonCashList = sql.raw(
					[...ASSET_TYPES, ...LIABILITY_TYPES].map((t) => `'${t}'`).join(", "),
				);

				const rows = await db.execute(sql`
					WITH tx AS (
						SELECT
							t.id,
							t.transaction_type,
							t.amount,
							t.transaction_date,
							a.account_type        AS source_type,
							a2.account_type       AS dest_type
						FROM ${transactions} t
						LEFT JOIN ${accounts} a  ON a.id  = t.account_id
						LEFT JOIN ${accounts} a2 ON a2.id = t.transfer_account_id
						WHERE t.user_id = ${user.id}
						  AND t.transaction_date >= NOW() - INTERVAL '1 month' * ${months}
					)
					SELECT
						EXTRACT(YEAR  FROM transaction_date)::int AS year,
						EXTRACT(MONTH FROM transaction_date)::int AS month,
						COALESCE(SUM(CASE WHEN transaction_type = 'income'
											AND source_type IN (${cashList})
										THEN amount ELSE 0 END), 0) AS income,
						COALESCE(SUM(CASE WHEN transaction_type = 'expense'
											AND source_type IN (${cashList})
										THEN amount ELSE 0 END), 0) AS expense,
						-- capital inflow: a non-cash account is the SOURCE, cash is the DEST.
						COALESCE(SUM(CASE WHEN transaction_type = 'transfer'
											AND source_type IN (${nonCashList})
											AND dest_type   IN (${cashList})
										THEN amount ELSE 0 END), 0) AS "capitalInflow",
						-- capital outflow: cash is SOURCE, a non-cash account is DEST.
						COALESCE(SUM(CASE WHEN transaction_type = 'transfer'
											AND source_type IN (${cashList})
											AND dest_type   IN (${nonCashList})
										THEN amount ELSE 0 END), 0) AS "capitalOutflow"
					FROM tx
					GROUP BY 1, 2
					ORDER BY 1, 2
				`);

				const sqlRows = (rows as unknown as SqlRows<CashflowSqlRow>).rows;
				const result = sqlRows.map((r) => {
					const income = Number(r.income);
					const expense = Number(r.expense);
					const capitalInflow = Number(r.capitalInflow);
					const capitalOutflow = Number(r.capitalOutflow);
					const netOperating = income - expense;
					const netCash = income + capitalInflow - expense - capitalOutflow;
					return {
						year: r.year,
						month: r.month,
						income: income.toFixed(2),
						expense: expense.toFixed(2),
						capitalInflow: capitalInflow.toFixed(2),
						capitalOutflow: capitalOutflow.toFixed(2),
						net: netOperating.toFixed(2),
						netCash: netCash.toFixed(2),
						savingsRate:
							income > 0 ? Math.round((netOperating / income) * 100) : 0,
					};
				});

				return json({ cashflow: result });
			},
		},
	},
});
