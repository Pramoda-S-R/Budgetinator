import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { contacts } from "./contacts";
import { users } from "./users";

export const loans = pgTable("loans", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	contactId: uuid("contact_id").references(() => contacts.id, {
		onDelete: "set null",
	}),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "restrict" }),
	loanType: text("loan_type").notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
	startedAt: timestamp("started_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	expectedEndDate: timestamp("expected_end_date", { withTimezone: true }),
	status: text("status").notNull().default("active"),
	notes: text("notes").notNull().default(""),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
