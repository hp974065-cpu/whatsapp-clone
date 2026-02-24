// ============================================
// User Service — SQLite Edition
// ============================================

const db = require('../../db');

/**
 * Get user profile by ID.
 */
async function getUserById(userId) {
    const result = db.query(
        `SELECT id, phone_number, display_name, avatar_url, status_text, created_at
     FROM users WHERE id = ?`,
        [userId]
    );
    return result.rows[0] || null;
}

/**
 * Update user profile.
 */
async function updateProfile(userId, { displayName, avatarUrl, statusText }) {
    const fields = [];
    const values = [];

    if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
    if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(avatarUrl); }
    if (statusText !== undefined) { fields.push('status_text = ?'); values.push(statusText); }

    if (fields.length === 0) return getUserById(userId);

    fields.push("updated_at = datetime('now')");
    values.push(userId);

    db.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    return getUserById(userId);
}

/**
 * Sync contacts: given a list of phone numbers, return registered users.
 */
async function syncContacts(phoneNumbers) {
    if (!phoneNumbers?.length) return [];

    // SQLite doesn't support ANY($1), use IN with placeholders
    const placeholders = phoneNumbers.map(() => '?').join(', ');
    const result = db.query(
        `SELECT id, phone_number, display_name, avatar_url, status_text
     FROM users
     WHERE phone_number IN (${placeholders})`,
        phoneNumbers
    );
    return result.rows;
}

/**
 * Search users by phone number or display name.
 */
async function searchUsers(searchQuery, currentUserId) {
    const pattern = `%${searchQuery}%`;
    const result = db.query(
        `SELECT id, phone_number, display_name, avatar_url, status_text
     FROM users
     WHERE id != ?
       AND (phone_number LIKE ? OR display_name LIKE ?)
     LIMIT 20`,
        [currentUserId, pattern, pattern]
    );
    return result.rows;
}

module.exports = { getUserById, updateProfile, syncContacts, searchUsers };
