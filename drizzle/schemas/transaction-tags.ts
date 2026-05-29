import { pgTable, text, uuid } from "drizzle-orm/pg-core";

import { transactions } from "./transactions";

export const transactionTags = pgTable("transaction_tags", {
	id: uuid("id").defaultRandom().primaryKey(),
	transactionId: uuid("transaction_id")
		.notNull()
		.references(() => transactions.id, { onDelete: "cascade" }),
	tag: text("tag").notNull(),
});
