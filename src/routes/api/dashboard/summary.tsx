import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { accounts, monthlyBudgets, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/dashboard/summary")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const now = new Date();
				const year = now.getUTCFullYear();
				const month = now.getUTCMonth() + 1;

				// net worth (sum of all balances included in net worth)
				const [{ netWorth }] = await db
					.select({
						netWorth: sql`coalesce(sum(${accounts.currentBalance}), 0)`,
					})
					.from(accounts)
					.where(
						and(
							eq(accounts.userId, user.id),
							eq(accounts.includeInNetWorth, true),
						),
					);

				// current cash (sum of non-investment balances)
				const [{ currentCash }] = await db
					.select({
						currentCash: sql`coalesce(sum(${accounts.currentBalance}), 0)`,
					})
					.from(accounts)
					.where(
						and(
							eq(accounts.userId, user.id),
							sql`${accounts.accountType} in ('bank','cash','wallet')`,
							eq(accounts.includeInNetWorth, true),
						),
					);

				// expected income for this month
				const [budgetRow] = await db
					.select({ expectedIncome: monthlyBudgets.expectedIncome })
					.from(monthlyBudgets)
					.where(
						and(
							eq(monthlyBudgets.userId, user.id),
							eq(monthlyBudgets.year, year),
							eq(monthlyBudgets.month, month),
						),
					)
					.limit(1);
				const expectedIncome = budgetRow?.expectedIncome ?? "0";

				// total income and expense for this month
				const [{ totalIncome, totalExpense }] = await db
					.select({
						totalIncome: sql`coalesce(sum(case when ${transactions.transactionType}='income' then ${transactions.amount} else 0 end), 0)`,
						totalExpense: sql`coalesce(sum(case when ${transactions.transactionType}='expense' then ${transactions.amount} else 0 end), 0)`,
					})
					.from(transactions)
					.where(
						and(
							eq(transactions.userId, user.id),
							sql`date_trunc('month', ${transactions.transactionDate}) = date_trunc('month', current_timestamp)`,
						),
					);

				// derived metrics
				const remainingBudget = (
					parseFloat(String(expectedIncome)) - parseFloat(String(totalExpense))
				).toFixed(2);
				const monthlySavings = (
					parseFloat(String(totalIncome)) - parseFloat(String(totalExpense))
				).toFixed(2);
				const savingsRate =
					String(totalIncome) === "0"
						? "0"
						: (
								(parseFloat(monthlySavings) / parseFloat(String(totalIncome))) *
								100
							).toFixed(2);
				const dayOfMonth = now.getUTCDate();
				const burnRate = (
					parseFloat(String(totalExpense)) / dayOfMonth
				).toFixed(2);

				// investment ratio (investments / net worth)
				const [{ totalInvestments }] = await db
					.select({
						totalInvestments: sql`coalesce(sum(${accounts.currentBalance}),0)`,
					})
					.from(accounts)
					.where(
						and(
							eq(accounts.userId, user.id),
							sql`${accounts.accountType}='investment'`,
							eq(accounts.includeInNetWorth, true),
						),
					);
				const investmentRatio =
					String(netWorth) === "0"
						? "0"
						: (
								(parseFloat(String(totalInvestments)) /
									parseFloat(String(netWorth))) *
								100
							).toFixed(2);

				return json({
					summary: {
						netWorth,
						currentCash,
						remainingBudget,
						monthlySavings,
						savingsRate,
						burnRate,
						investmentRatio,
					},
				});
			},
		},
	},
});
