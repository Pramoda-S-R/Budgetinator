import { pgTable, text, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const contacts = pgTable("contacts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	phone: text("phone").notNull().default(""),
	notes: text("notes").notNull().default(""),
});
