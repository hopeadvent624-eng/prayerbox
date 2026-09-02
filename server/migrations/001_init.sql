-- PostgreSQL initialization for AY Prayerbox
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar TEXT,
  bio TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  accountStatus TEXT NOT NULL DEFAULT 'active',
  createdAt TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS prayers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  request TEXT NOT NULL,
  category TEXT NOT NULL,
  prayerCount INTEGER NOT NULL DEFAULT 0,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  urgent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS testimonies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  daysAgo INTEGER NOT NULL DEFAULT 0,
  prayerCount INTEGER NOT NULL DEFAULT 0,
  approved BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id),
  refreshTokenHash TEXT NOT NULL,
  expiresAt TIMESTAMPTZ NOT NULL,
  revokedAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ NOT NULL,
  lastUsedAt TIMESTAMPTZ NOT NULL,
  ipAddress TEXT,
  userAgent TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actorUserId INTEGER,
  actorEmail TEXT,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT,
  metadata JSONB,
  ipAddress TEXT,
  createdAt TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS account_action_tokens (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  tokenHash TEXT NOT NULL,
  expiresAt TIMESTAMPTZ NOT NULL,
  usedAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_prayers_category ON prayers(category);
CREATE INDEX IF NOT EXISTS idx_testimonies_category ON testimonies(category);

COMMIT;
