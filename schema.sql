-- SlipSync D1 Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    google_id TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    source TEXT NOT NULL,
    sender_name TEXT,
    note TEXT,
    slip_url TEXT,
    transaction_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    user_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Default categories
INSERT INTO categories (id, name, icon, color, user_id, created_at) VALUES
    ('cat-food', 'อาหาร', '🍜', '#ff6b6b', NULL, datetime('now')),
    ('cat-transport', 'เดินทาง', '🚗', '#4ecdc4', NULL, datetime('now')),
    ('cat-shopping', 'ช้อปปิ้ง', '🛍️', '#a855f7', NULL, datetime('now')),
    ('cat-bill', 'บิล/ค่าบริการ', '💡', '#f59e0b', NULL, datetime('now')),
    ('cat-salary', 'เงินเดือน', '💰', '#22c55e', NULL, datetime('now')),
    ('cat-other', 'อื่นๆ', '📦', '#6b7280', NULL, datetime('now'));
