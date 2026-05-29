import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { users } from "./users";

export const investments = pgTable("investments", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "restrict" }),
	name: text("name").notNull(),
	investmentType: text("investment_type").notNull(),
	symbol: text("symbol"),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
