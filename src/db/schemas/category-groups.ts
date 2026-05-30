import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const categoryGroups = pgTable("category_groups", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: text("type").notNull(),
	icon: text("icon").notNull().default("folder"),
	color: text("color").notNull().default("#475569"),
	sortOrder: integer("sort_order").notNull().default(0),
	isArchived: boolean("is_archived").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
