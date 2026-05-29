import { numeric, pgTable, uuid } from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { categoryGroups } from "./category-groups";
import { monthlyBudgets } from "./monthly-budgets";

export const monthlyBudgetAllocations = pgTable("monthly_budget_allocations", {
	id: uuid("id").defaultRandom().primaryKey(),
	monthlyBudgetId: uuid("monthly_budget_id")
		.notNull()
		.references(() => monthlyBudgets.id, { onDelete: "cascade" }),
	categoryGroupId: uuid("category_group_id").references(
		() => categoryGroups.id,
		{ onDelete: "set null" },
	),
	categoryId: uuid("category_id").references(() => categories.id, {
		onDelete: "set null",
	}),
	allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 }).notNull(),
});
