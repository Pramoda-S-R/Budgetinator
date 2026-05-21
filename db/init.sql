CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    include_in_net_worth BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    balance NUMERIC(14, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (email, name, currency_code, timezone)
VALUES ('demo@budgetinator.dev', 'Demo User', 'USD', 'UTC')
ON CONFLICT (email) DO NOTHING;

INSERT INTO accounts (user_id, name, account_type, current_balance, include_in_net_worth, is_active)
SELECT id, 'Primary Account', 'bank', 0, TRUE, TRUE
FROM users
WHERE email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM accounts WHERE name = 'Primary Account'
);
