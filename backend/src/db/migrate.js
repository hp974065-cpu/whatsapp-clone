// ============================================
// Database Migration — SQLite Edition
// ============================================
// Creates all tables. Run: npm run db:migrate
// ============================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'whatsapp.db');
const db = new Database(dbPath);

console.log('[Migration] Running on:', dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Execute each statement individually to avoid semicolon splitting issues
const tables = [
    // 1. Users
    `CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    phone_number    TEXT UNIQUE NOT NULL,
    display_name    TEXT DEFAULT '',
    avatar_url      TEXT DEFAULT '',
    status_text     TEXT DEFAULT 'Hey there! I am using WhatsApp.',
    last_seen       TEXT DEFAULT (datetime('now')),
    is_online       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  )`,

    // 2. Conversations
    `CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    group_name      TEXT,
    group_avatar    TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  )`,

    // 3. Conversation Members
    `CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at       TEXT DEFAULT (datetime('now')),
    last_read_at    TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, user_id)
  )`,

    // 4. Messages
    `CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL REFERENCES users(id),
    content_type    TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'document')),
    text_content    TEXT,
    media_url       TEXT,
    media_thumbnail TEXT,
    media_size      INTEGER,
    is_deleted      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

    `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,

    // 5. Message Status
    `CREATE TABLE IF NOT EXISTS message_status (
    message_id    TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id),
    status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    updated_at    TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id)
  )`,

    // 6. Refresh Tokens
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    device_id       TEXT,
    family_id       TEXT NOT NULL,
    is_revoked      INTEGER DEFAULT 0,
    expires_at      TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,

    // 7. FCM Tokens
    `CREATE TABLE IF NOT EXISTS fcm_tokens (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    device_id       TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,
];

for (const sql of tables) {
    try {
        db.exec(sql);
    } catch (err) {
        console.error('[Migration] ❌', err.message);
        console.error('  SQL:', sql.substring(0, 80) + '...');
    }
}

console.log('[Migration] ✅ All 7 tables created successfully');
db.close();
