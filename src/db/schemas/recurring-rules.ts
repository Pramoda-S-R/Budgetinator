import {
	boolean,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { categories } from "./categories";
import { users } from "./users";

export const recurringRules = pgTable("recurring_rules", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	categoryId: uuid("category_id").references(() => categories.id, {
		onDelete: "set null",
	}),
	accountId: uuid("account_id").references(() => accounts.id, {
		onDelete: "set null",
	}),
	description: text("description").notNull(),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	frequency: text("frequency").notNull(),
	nextRunDate: timestamp("next_run_date", { withTimezone: true }).notNull(),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
