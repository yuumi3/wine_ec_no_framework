PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  address       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS wines (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  price        INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'JPY',
  image        TEXT NOT NULL,
  category     TEXT NOT NULL,
  region       TEXT NOT NULL,
  appellation  TEXT,
  vintage      INTEGER,
  grape        TEXT,
  alcohol      TEXT,
  description  TEXT NOT NULL DEFAULT '',
  food_pairing TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wine_id    INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK(quantity > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, wine_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
