import {
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { budgetPresets } from "./budget-presets";
import { users } from "./users";

export const monthlyBudgets = pgTable("monthly_budgets", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	year: integer("year").notNull(),
	month: integer("month").notNull(),
	presetId: uuid("preset_id").references(() => budgetPresets.id, {
		onDelete: "set null",
	}),
	expectedIncome: numeric("expected_income", { precision: 14, scale: 2 })
		.notNull()
		.default("0"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
