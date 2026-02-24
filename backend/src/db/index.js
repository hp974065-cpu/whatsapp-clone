// ============================================
// Database Layer — SQLite (No Docker needed!)
// ============================================
// Drop-in replacement for the PostgreSQL pool
// using better-sqlite3. Provides the same
// query(sql, params) interface.
// ============================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create data directory
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'whatsapp.db');
const db = new Database(dbPath, { verbose: null });

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('[DB] SQLite database at:', dbPath);

/**
 * Execute a query and return results in pg-compatible format.
 * Translates PostgreSQL $1, $2 placeholders to SQLite ? placeholders.
 */
function query(sql, params = []) {
    // Convert PostgreSQL-style $1, $2 params to ? placeholders
    let sqliteSQL = sql;

    if (params.length > 0) {
        for (let i = params.length; i >= 1; i--) {
            sqliteSQL = sqliteSQL.replace(new RegExp('\\$' + i, 'g'), '?');
        }
    }

    // Convert params: Date objects → ISO strings, undefined → null
    const sqliteParams = params.map(p => {
        if (p instanceof Date) return p.toISOString();
        if (p === undefined) return null;
        return p;
    });

    // Normalize SQL for SQLite compatibility
    sqliteSQL = normalizeSql(sqliteSQL);

    const trimmed = sqliteSQL.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT');
    const hasReturning = /\bRETURNING\b/i.test(sqliteSQL);

    try {
        if (isSelect) {
            const rows = db.prepare(sqliteSQL).all(...sqliteParams);
            return { rows, rowCount: rows.length };
        } else if (hasReturning) {
            // SQLite supports RETURNING in v3.35+, better-sqlite3 supports it
            const rows = db.prepare(sqliteSQL).all(...sqliteParams);
            return { rows, rowCount: rows.length };
        } else {
            const info = db.prepare(sqliteSQL).run(...sqliteParams);
            return { rows: [], rowCount: info.changes };
        }
    } catch (err) {
        // Handle "no such table" and other errors gracefully
        if (err.message.includes('no such table')) {
            console.warn('[DB] Table missing — run migration first: npm run db:migrate');
        }
        throw err;
    }
}

/**
 * Normalize PostgreSQL SQL to SQLite-compatible SQL.
 */
function normalizeSql(sql) {
    let s = sql;

    // Replace ILIKE with LIKE (SQLite is case-insensitive for ASCII)
    s = s.replace(/\bILIKE\b/gi, 'LIKE');

    // Replace NOW() with datetime('now')
    s = s.replace(/\bNOW\(\)/gi, "datetime('now')");

    // Replace CURRENT_TIMESTAMP in expressions
    // (SQLite supports CURRENT_TIMESTAMP as default, but not in comparisons the same way)

    // Replace interval syntax: NOW() - INTERVAL '5 minutes' → datetime('now', '-5 minutes')
    s = s.replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*(minutes?|hours?|days?|seconds?)'/gi,
        (match, num, unit) => `datetime('now', '-${num} ${unit}')`);

    // Replace ON CONFLICT DO NOTHING
    // (SQLite supports this natively, good)

    // Replace boolean TRUE/FALSE
    s = s.replace(/\bTRUE\b/g, '1').replace(/\bFALSE\b/g, '0');

    // Replace UUID generation — gen_random_uuid()
    s = s.replace(/gen_random_uuid\(\)/gi, `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`);

    return s;
}

/**
 * Execute multiple statements in a transaction.
 */
function transaction(fn) {
    const trx = db.transaction(fn);
    return trx();
}

/**
 * Get the raw SQLite database instance.
 */
function getDb() {
    return db;
}

module.exports = { query, transaction, getDb, pool: { end: () => db.close() } };
