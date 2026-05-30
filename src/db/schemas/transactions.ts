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

export const transactions = pgTable("transactions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	transferAccountId: uuid("transfer_account_id").references(() => accounts.id, {
		onDelete: "restrict",
	}),
	categoryId: uuid("category_id").references(() => categories.id, {
		onDelete: "set null",
	}),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	transactionDate: timestamp("transaction_date", { withTimezone: true })
		.defaultNow()
		.notNull(),
	merchant: text("merchant").notNull().default(""),
	notes: text("notes").notNull().default(""),
	isRecurring: boolean("is_recurring").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
