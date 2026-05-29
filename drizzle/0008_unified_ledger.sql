-- ============================================================================
-- 0008 Unified Ledger
--
-- Loans / EMIs / Investments are no longer financial silos.  Each one now owns
-- a paired row in `accounts` (asset for investments / loan-given, liability
-- for loan-taken / EMI), so net worth comes from a single SUM over
-- `accounts.current_balance` and every movement flows through `transactions`.
--
-- This migration:
--   1. Adds account_id FKs to emis & investments (nullable for backfill).
--   2. Replaces every loan's account_id (which used to point at the source
--      bank) with a fresh paired loan_given / loan_taken account.
--   3. Auto-creates paired liability accounts for every existing EMI and asset
--      accounts for every existing investment.
--   4. Marks all three account_id columns NOT NULL.
--   5. Drops the denormalised balance columns (loans.principal_amount,
--      loans.remaining_amount, emis.principal) — read from the linked account.
--   6. Drops the redundant investment_valuations table (account balance +
--      account_balance_history now serve that purpose).
--
-- This script is idempotent: it can be re-run if a previous run failed
-- partway through.
-- ============================================================================

ALTER TABLE "emis"        ADD COLUMN IF NOT EXISTS "account_id" uuid;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "account_id" uuid;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emis_account_id_accounts_id_fk') THEN
    ALTER TABLE "emis"
      ADD CONSTRAINT "emis_account_id_accounts_id_fk"
      FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investments_account_id_accounts_id_fk') THEN
    ALTER TABLE "investments"
      ADD CONSTRAINT "investments_account_id_accounts_id_fk"
      FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill: one paired account per existing loan / emi / investment.
--
-- Loans get a *fresh* paired account regardless of the existing account_id
-- value (the legacy column pointed at a bank, which is the wrong role for the
-- new model).  EMIs and investments only backfill rows that don't yet have
-- a paired account so the script is safe to re-run.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  l record;
  e record;
  i record;
  new_acct_id uuid;
  initial_balance numeric(14, 2);
  acct_type text;
BEGIN
  -- Loans: replace any pre-existing account_id (which pointed at a bank)
  -- with a fresh asset/liability account whose balance reflects the loan.
  FOR l IN
    SELECT lo.*, c.name AS contact_name
    FROM loans lo LEFT JOIN contacts c ON c.id = lo.contact_id
    WHERE lo.account_id IS NULL
       OR NOT EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.id = lo.account_id
              AND a.account_type IN ('loan_given', 'loan_taken')
          )
  LOOP
    initial_balance := CASE WHEN l.loan_type = 'given'
                            THEN l.remaining_amount
                            ELSE -l.remaining_amount END;
    acct_type := CASE WHEN l.loan_type = 'given' THEN 'loan_given' ELSE 'loan_taken' END;
    INSERT INTO accounts (user_id, name, account_type, current_balance, include_in_net_worth, is_active)
    VALUES (
      l.user_id,
      CASE WHEN l.loan_type = 'given'
           THEN 'Loan to ' || COALESCE(NULLIF(l.contact_name, ''), 'unknown')
           ELSE 'Loan from ' || COALESCE(NULLIF(l.contact_name, ''), 'unknown') END,
      acct_type,
      initial_balance,
      true,
      l.status = 'active'
    )
    RETURNING id INTO new_acct_id;

    INSERT INTO account_balance_history (account_id, balance, recorded_at)
    VALUES (new_acct_id, initial_balance, l.started_at);

    UPDATE loans SET account_id = new_acct_id WHERE id = l.id;
  END LOOP;

  -- EMIs: liability with starting balance = -(principal - sum_paid)
  FOR e IN
    SELECT em.*,
           COALESCE((SELECT SUM(amount) FROM emi_payments WHERE emi_id = em.id), 0) AS paid_so_far
    FROM emis em
    WHERE em.account_id IS NULL
  LOOP
    initial_balance := -(e.principal - e.paid_so_far);
    INSERT INTO accounts (user_id, name, account_type, current_balance, include_in_net_worth, is_active)
    VALUES (
      e.user_id,
      'EMI: ' || e.name,
      'emi',
      initial_balance,
      true,
      e.status = 'active'
    )
    RETURNING id INTO new_acct_id;

    INSERT INTO account_balance_history (account_id, balance, recorded_at)
    VALUES (new_acct_id, initial_balance, e.start_date);

    UPDATE emis SET account_id = new_acct_id WHERE id = e.id;
  END LOOP;

  -- Investments: asset with balance = latest valuation, else sum of entries, else 0
  FOR i IN
    SELECT inv.*,
           COALESCE(
             (SELECT iv.valuation_amount FROM investment_valuations iv
              WHERE iv.investment_id = inv.id
              ORDER BY iv.valuation_date DESC LIMIT 1),
             (SELECT SUM(amount_invested) FROM investment_entries ie WHERE ie.investment_id = inv.id),
             0
           ) AS effective_value
    FROM investments inv
    WHERE inv.account_id IS NULL
  LOOP
    initial_balance := i.effective_value;
    INSERT INTO accounts (user_id, name, account_type, current_balance, include_in_net_worth, is_active)
    VALUES (
      i.user_id,
      i.name,
      'investment',
      initial_balance,
      true,
      i.status = 'active'
    )
    RETURNING id INTO new_acct_id;

    INSERT INTO account_balance_history (account_id, balance, recorded_at)
    VALUES (new_acct_id, initial_balance, i.created_at);

    UPDATE investments SET account_id = new_acct_id WHERE id = i.id;
  END LOOP;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Lock the FKs to NOT NULL now that every row has a paired account.
-- ---------------------------------------------------------------------------
ALTER TABLE "loans"       ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "emis"        ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "investments" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint

-- Tighten the loans.account_id FK from SET NULL to RESTRICT — account loss must
-- be intentional, never silent.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loans_account_id_accounts_id_fk' AND confdeltype = 'n'  -- SET NULL
  ) THEN
    ALTER TABLE "loans" DROP CONSTRAINT "loans_account_id_accounts_id_fk";
    ALTER TABLE "loans"
      ADD CONSTRAINT "loans_account_id_accounts_id_fk"
      FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Drop denormalised columns.
-- ---------------------------------------------------------------------------
ALTER TABLE "loans" DROP COLUMN IF EXISTS "principal_amount";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN IF EXISTS "remaining_amount";--> statement-breakpoint
ALTER TABLE "emis"  DROP COLUMN IF EXISTS "principal";--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Drop redundant table: valuations are now just balance updates on the
-- investment account, captured in account_balance_history.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "investment_valuations";--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_emis_account"        ON "emis"        ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_investments_account" ON "investments" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_type"       ON "accounts"    ("account_type");
