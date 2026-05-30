import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { investments } from "./investments";

export const investmentEntries = pgTable("investment_entries", {
	id: uuid("id").defaultRandom().primaryKey(),
	investmentId: uuid("investment_id")
		.notNull()
		.references(() => investments.id, { onDelete: "cascade" }),
	amountInvested: numeric("amount_invested", {
		precision: 14,
		scale: 2,
	}).notNull(),
	units: numeric("units", { precision: 14, scale: 4 }),
	investedAt: timestamp("invested_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	notes: text("notes").notNull().default(""),
});
