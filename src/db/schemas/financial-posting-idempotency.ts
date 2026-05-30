import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const financialPostingIdempotency = pgTable(
	"financial_posting_idempotency",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		operationKind: text("operation_kind").notNull(),
		postingKey: text("posting_key").notNull(),
		payloadHash: text("payload_hash").notNull(),
		schemaVersion: integer("schema_version").notNull(),
		resultSnapshot: jsonb("result_snapshot").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("financial_posting_idempotency_user_kind_key_idx").on(
			table.userId,
			table.operationKind,
			table.postingKey,
		),
	],
);
