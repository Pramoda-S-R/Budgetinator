import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const forecastSnapshots = pgTable("forecast_snapshots", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	forecastMonth: timestamp("forecast_month", { withTimezone: true }).notNull(),
	predictedSpend: numeric("predicted_spend", {
		precision: 14,
		scale: 2,
	}).notNull(),
	predictedSavings: numeric("predicted_savings", {
		precision: 14,
		scale: 2,
	}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
