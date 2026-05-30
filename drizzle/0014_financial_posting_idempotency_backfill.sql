CREATE TABLE IF NOT EXISTS "financial_posting_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operation_kind" text NOT NULL,
	"posting_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"schema_version" integer NOT NULL,
	"result_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'financial_posting_idempotency_user_id_users_id_fk'
	) THEN
		ALTER TABLE "financial_posting_idempotency"
		ADD CONSTRAINT "financial_posting_idempotency_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
		ON DELETE cascade
		ON UPDATE no action;
	END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "financial_posting_idempotency_user_kind_key_idx"
	ON "financial_posting_idempotency" USING btree ("user_id", "operation_kind", "posting_key");
