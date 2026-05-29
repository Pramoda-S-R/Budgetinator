import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { loans } from "./loans";

export const loanPayments = pgTable("loan_payments", {
	id: uuid("id").defaultRandom().primaryKey(),
	loanId: uuid("loan_id")
		.notNull()
		.references(() => loans.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
});
