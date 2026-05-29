import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { categoryGroups } from "./category-groups";
import { users } from "./users";

export const categories = pgTable("categories", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	groupId: uuid("group_id")
		.notNull()
		.references(() => categoryGroups.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	icon: text("icon").notNull().default("tag"),
	color: text("color").notNull().default("#64748b"),
	transactionType: text("transaction_type").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	isArchived: boolean("is_archived").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
