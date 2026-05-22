CREATE TABLE "budget_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monthly_budget_id" uuid NOT NULL,
	"category_group_id" uuid,
	"category_id" uuid,
	"allocated_amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"preset_id" uuid,
	"expected_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preset_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preset_id" uuid NOT NULL,
	"category_group_id" uuid,
	"category_id" uuid,
	"allocated_amount" numeric(14, 2) NOT NULL,
	"allocation_percent" numeric(5, 2)
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "transfer_account_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "budget_presets" ADD CONSTRAINT "budget_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_allocations" ADD CONSTRAINT "monthly_budget_allocations_monthly_budget_id_monthly_budgets_id_fk" FOREIGN KEY ("monthly_budget_id") REFERENCES "public"."monthly_budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_allocations" ADD CONSTRAINT "monthly_budget_allocations_category_group_id_category_groups_id_fk" FOREIGN KEY ("category_group_id") REFERENCES "public"."category_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_allocations" ADD CONSTRAINT "monthly_budget_allocations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_preset_id_budget_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."budget_presets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_allocations" ADD CONSTRAINT "preset_allocations_preset_id_budget_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."budget_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_allocations" ADD CONSTRAINT "preset_allocations_category_group_id_category_groups_id_fk" FOREIGN KEY ("category_group_id") REFERENCES "public"."category_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_allocations" ADD CONSTRAINT "preset_allocations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;