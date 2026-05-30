import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const accounts = pgTable("accounts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	accountType: text("account_type").notNull(),
	currentBalance: numeric("current_balance", { precision: 14, scale: 2 })
		.notNull()
		.default("0"),
	creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }),
	nextBillingDate: text("next_billing_date"),
	includeInNetWorth: boolean("include_in_net_worth").notNull().default(true),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
