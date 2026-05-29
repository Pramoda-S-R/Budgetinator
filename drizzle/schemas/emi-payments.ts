import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { emis } from "./emis";

export const emiPayments = pgTable("emi_payments", {
	id: uuid("id").defaultRandom().primaryKey(),
	emiId: uuid("emi_id")
		.notNull()
		.references(() => emis.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
});
