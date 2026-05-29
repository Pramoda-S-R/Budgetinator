import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { users } from "./users";

export const emis = pgTable("emis", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "restrict" }),
	name: text("name").notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
	monthlyAmount: numeric("monthly_amount", { precision: 14, scale: 2 }).notNull(),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true }).notNull(),
	nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
	lenderName: text("lender_name").notNull().default(""),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
