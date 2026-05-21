CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (email, name, currency_code, timezone)
VALUES ('demo@budgetinator.dev', 'Demo User', 'USD', 'UTC')
ON CONFLICT (email) DO NOTHING;
