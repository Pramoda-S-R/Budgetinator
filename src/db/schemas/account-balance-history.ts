import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";

export const accountBalanceHistory = pgTable("account_balance_history", {
	id: uuid("id").defaultRandom().primaryKey(),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
