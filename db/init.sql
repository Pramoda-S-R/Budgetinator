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

CREATE TABLE IF NOT EXISTS category_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'folder',
    color TEXT NOT NULL DEFAULT '#475569',
    sort_order INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'tag',
    color TEXT NOT NULL DEFAULT '#64748b',
    transaction_type TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

INSERT INTO category_groups (user_id, name, type, icon, color, sort_order)
SELECT id, 'Essential', 'expense', 'home', '#ef4444', 0
FROM users
WHERE email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM category_groups WHERE user_id = users.id
);

INSERT INTO category_groups (user_id, name, type, icon, color, sort_order)
SELECT id, 'Lifestyle', 'expense', 'sparkles', '#f59e0b', 1
FROM users
WHERE email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM category_groups WHERE user_id = users.id AND name = 'Lifestyle'
);

INSERT INTO category_groups (user_id, name, type, icon, color, sort_order)
SELECT id, 'Investments', 'income', 'chart-line', '#10b981', 2
FROM users
WHERE email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM category_groups WHERE user_id = users.id AND name = 'Investments'
);

INSERT INTO categories (user_id, group_id, name, icon, color, transaction_type, sort_order)
SELECT u.id, cg.id, 'Rent', 'tag', '#64748b', 'expense', 0
FROM users u
JOIN category_groups cg ON cg.user_id = u.id AND cg.name = 'Essential'
WHERE u.email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id
);

INSERT INTO categories (user_id, group_id, name, icon, color, transaction_type, sort_order)
SELECT u.id, cg.id, 'Utilities', 'tag', '#64748b', 'expense', 1
FROM users u
JOIN category_groups cg ON cg.user_id = u.id AND cg.name = 'Essential'
WHERE u.email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Utilities'
);

INSERT INTO categories (user_id, group_id, name, icon, color, transaction_type, sort_order)
SELECT u.id, cg.id, 'Dining Out', 'tag', '#64748b', 'expense', 2
FROM users u
JOIN category_groups cg ON cg.user_id = u.id AND cg.name = 'Lifestyle'
WHERE u.email = 'demo@budgetinator.dev'
AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Dining Out'
);
