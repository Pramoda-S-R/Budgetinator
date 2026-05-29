import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const budgetPresets = pgTable("budget_presets", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
