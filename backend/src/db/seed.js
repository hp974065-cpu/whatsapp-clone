// ============================================
// Database Seed — Test Data (SQLite Edition)
// ============================================
// Creates test users and conversations for
// quick development testing.
// Run: npm run db:seed
// ============================================

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'whatsapp.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('[Seed] Creating test data...');

// Helper to generate UUID
function uuid() {
    const hex = (n) => [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    return `${hex(8)}-${hex(4)}-4${hex(3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}

const userId1 = uuid();
const userId2 = uuid();
const userId3 = uuid();

// Create test users
db.prepare(`INSERT OR REPLACE INTO users (id, phone_number, display_name, status_text) VALUES (?, ?, ?, ?)`)
    .run(userId1, '+911111111111', 'Alice', 'Available');

db.prepare(`INSERT OR REPLACE INTO users (id, phone_number, display_name, status_text) VALUES (?, ?, ?, ?)`)
    .run(userId2, '+912222222222', 'Bob', 'At work');

db.prepare(`INSERT OR REPLACE INTO users (id, phone_number, display_name, status_text) VALUES (?, ?, ?, ?)`)
    .run(userId3, '+913333333333', 'Charlie', 'Busy');

console.log('[Seed] Users created:');
console.log('  Alice:  ', userId1, '(+911111111111)');
console.log('  Bob:    ', userId2, '(+912222222222)');
console.log('  Charlie:', userId3, '(+913333333333)');

// Create a direct conversation between Alice and Bob
const convId = uuid();
db.prepare(`INSERT INTO conversations (id, type, created_by) VALUES (?, 'direct', ?)`)
    .run(convId, userId1);

db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`)
    .run(convId, userId1);
db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`)
    .run(convId, userId2);

// Add sample messages
const messages = [
    { sender: userId1, text: 'Hey Bob! How are you?' },
    { sender: userId2, text: 'Hi Alice! I am doing great, thanks!' },
    { sender: userId1, text: 'Want to grab coffee later?' },
    { sender: userId2, text: 'Sure! Let me know when.' },
    { sender: userId1, text: 'How about 4 PM?' },
];

const insertMsg = db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, content_type, text_content) VALUES (?, ?, ?, 'text', ?)`
);

for (const msg of messages) {
    insertMsg.run(uuid(), convId, msg.sender, msg.text);
}

// Create a group conversation
const groupId = uuid();
db.prepare(`INSERT INTO conversations (id, type, group_name, created_by) VALUES (?, 'group', 'Project Team', ?)`)
    .run(groupId, userId1);

db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'admin')`)
    .run(groupId, userId1);
db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')`)
    .run(groupId, userId2);
db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')`)
    .run(groupId, userId3);

db.prepare(`INSERT INTO messages (id, conversation_id, sender_id, content_type, text_content) VALUES (?, ?, ?, 'text', ?)`)
    .run(uuid(), groupId, userId1, 'Welcome to the Project Team group!');

console.log('[Seed] ✅ Test data created:');
console.log(`  Direct conversation: ${convId} (Alice ↔ Bob)`);
console.log(`  Group conversation:  ${groupId} (Project Team)`);

db.close();
