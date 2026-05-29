import { numeric, pgTable, uuid } from "drizzle-orm/pg-core";

import { budgetPresets } from "./budget-presets";
import { categories } from "./categories";
import { categoryGroups } from "./category-groups";

export const presetAllocations = pgTable("preset_allocations", {
	id: uuid("id").defaultRandom().primaryKey(),
	presetId: uuid("preset_id")
		.notNull()
		.references(() => budgetPresets.id, { onDelete: "cascade" }),
	categoryGroupId: uuid("category_group_id").references(
		() => categoryGroups.id,
		{ onDelete: "set null" },
	),
	categoryId: uuid("category_id").references(() => categories.id, {
		onDelete: "set null",
	}),
	allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 }).notNull(),
	allocationPercent: numeric("allocation_percent", { precision: 5, scale: 2 }),
});
