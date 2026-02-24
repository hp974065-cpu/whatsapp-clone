// ============================================
// Messaging Service — SQLite Edition
// ============================================
// Core business logic for sending, receiving,
// and tracking message status.
// ============================================

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

/**
 * Find or create a direct conversation between two users.
 */
async function findOrCreateDirectConversation(userId1, userId2) {
    // Check if a direct conversation already exists
    const existing = db.query(
        `SELECT c.* FROM conversations c
     JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
     JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
     WHERE c.type = 'direct'
     LIMIT 1`,
        [userId1, userId2]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    // Create new direct conversation
    const convId = uuidv4();
    db.query(
        `INSERT INTO conversations (id, type, created_by) VALUES (?, 'direct', ?)`,
        [convId, userId1]
    );

    // Add both users as members
    db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')`,
        [convId, userId1]
    );
    db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')`,
        [convId, userId2]
    );

    // Return the created conversation
    const conv = db.query(`SELECT * FROM conversations WHERE id = ?`, [convId]);
    return conv.rows[0];
}

/**
 * Send a message in a conversation.
 */
async function sendMessage({ conversationId, senderId, contentType = 'text', textContent, mediaUrl, mediaThumbnail, mediaSize }) {
    const msgId = uuidv4();

    // 1. Insert the message
    db.query(
        `INSERT INTO messages (id, conversation_id, sender_id, content_type, text_content, media_url, media_thumbnail, media_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [msgId, conversationId, senderId, contentType, textContent || null, mediaUrl || null, mediaThumbnail || null, mediaSize || null]
    );

    // 2. Get the inserted message
    const msgResult = db.query(`SELECT * FROM messages WHERE id = ?`, [msgId]);
    const message = msgResult.rows[0];

    // 3. Get all recipients (members except sender)
    const membersResult = db.query(
        `SELECT user_id FROM conversation_members
     WHERE conversation_id = ? AND user_id != ?`,
        [conversationId, senderId]
    );

    // 4. Create message_status rows for each recipient
    for (const member of membersResult.rows) {
        db.query(
            `INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, 'sent')`,
            [msgId, member.user_id]
        );
    }

    // 5. Update conversation's updated_at
    db.query(
        `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`,
        [conversationId]
    );

    // Get sender info
    const senderResult = db.query(
        `SELECT display_name, avatar_url FROM users WHERE id = ?`,
        [senderId]
    );

    return {
        ...message,
        sender_name: senderResult.rows[0]?.display_name,
        sender_avatar: senderResult.rows[0]?.avatar_url,
        recipients: membersResult.rows.map(r => r.user_id),
    };
}

/**
 * Update message status (delivered or read).
 */
async function updateMessageStatus(messageId, userId, newStatus) {
    db.query(
        `UPDATE message_status SET status = ?, updated_at = datetime('now')
     WHERE message_id = ? AND user_id = ?`,
        [newStatus, messageId, userId]
    );

    // Get sender_id of the message (to notify them)
    const msgResult = db.query(
        `SELECT sender_id FROM messages WHERE id = ?`,
        [messageId]
    );

    return {
        messageId,
        userId,
        status: newStatus,
        sender_id: msgResult.rows[0]?.sender_id,
    };
}

/**
 * Mark all messages in a conversation as read for a user.
 */
async function markConversationRead(conversationId, userId) {
    // Find all unread messages in this conversation sent TO this user
    const unread = db.query(
        `SELECT ms.message_id, m.sender_id
     FROM message_status ms
     JOIN messages m ON ms.message_id = m.id
     WHERE m.conversation_id = ? AND ms.user_id = ? AND ms.status != 'read'`,
        [conversationId, userId]
    );

    // Update all to read
    if (unread.rows.length > 0) {
        db.query(
            `UPDATE message_status SET status = 'read', updated_at = datetime('now')
       WHERE user_id = ? AND message_id IN (
         SELECT m.id FROM messages m WHERE m.conversation_id = ? AND m.id IN (
           SELECT message_id FROM message_status WHERE user_id = ? AND status != 'read'
         )
       )`,
            [userId, conversationId, userId]
        );
    }

    // Update last_read_at
    db.query(
        `UPDATE conversation_members SET last_read_at = datetime('now')
     WHERE conversation_id = ? AND user_id = ?`,
        [conversationId, userId]
    );

    return unread.rows;
}

/**
 * Get paginated messages for a conversation.
 */
async function getConversationMessages(conversationId, userId, { limit = 50, before } = {}) {
    let sql = `
    SELECT m.*,
           COALESCE(ms.status, 'sent') as delivery_status,
           u.display_name as sender_name, u.avatar_url as sender_avatar
    FROM messages m
    LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = ?
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? AND m.is_deleted = 0
  `;
    const params = [userId, conversationId];

    if (before) {
        sql += ` AND m.created_at < ?`;
        params.push(before);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(limit);

    const result = db.query(sql, params);
    return result.rows;
}

/**
 * Get conversation list for a user (with last message preview).
 */
async function getUserConversations(userId) {
    const result = db.query(
        `SELECT
       c.id, c.type, c.group_name, c.group_avatar, c.updated_at,
       -- Last message (subquery)
       (SELECT text_content FROM messages WHERE conversation_id = c.id AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1) as last_message_text,
       (SELECT content_type FROM messages WHERE conversation_id = c.id AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1) as last_message_type,
       (SELECT created_at FROM messages WHERE conversation_id = c.id AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1) as last_message_at,
       (SELECT u2.display_name FROM messages m2 JOIN users u2 ON m2.sender_id = u2.id WHERE m2.conversation_id = c.id AND m2.is_deleted = 0 ORDER BY m2.created_at DESC LIMIT 1) as last_message_sender,
       -- Unread count
       (SELECT COUNT(*) FROM messages m3
        JOIN message_status ms3 ON m3.id = ms3.message_id
        WHERE m3.conversation_id = c.id AND ms3.user_id = ? AND ms3.status != 'read') as unread_count,
       -- Other user (for direct chats)
       other_user.id as other_user_id,
       other_user.display_name as other_user_name,
       other_user.avatar_url as other_user_avatar,
       other_user.status_text as other_user_status
     FROM conversation_members cm
     JOIN conversations c ON cm.conversation_id = c.id
     LEFT JOIN conversation_members cm2
       ON cm2.conversation_id = c.id AND cm2.user_id != ? AND c.type = 'direct'
     LEFT JOIN users other_user ON cm2.user_id = other_user.id
     WHERE cm.user_id = ?
     ORDER BY COALESCE(
       (SELECT created_at FROM messages WHERE conversation_id = c.id AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1),
       c.updated_at
     ) DESC`,
        [userId, userId, userId]
    );

    return result.rows;
}

/**
 * Get messages created after a timestamp (for sync-on-reconnect).
 */
async function getMessagesSince(userId, sinceTimestamp) {
    const result = db.query(
        `SELECT m.*,
            COALESCE(ms.status, 'sent') as delivery_status,
            u.display_name as sender_name
     FROM messages m
     JOIN conversation_members cm ON m.conversation_id = cm.conversation_id AND cm.user_id = ?
     LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = ?
     JOIN users u ON m.sender_id = u.id
     WHERE m.created_at > ? AND m.is_deleted = 0
     ORDER BY m.created_at ASC
     LIMIT 500`,
        [userId, userId, sinceTimestamp]
    );

    return result.rows;
}

module.exports = {
    findOrCreateDirectConversation,
    sendMessage,
    updateMessageStatus,
    markConversationRead,
    getConversationMessages,
    getUserConversations,
    getMessagesSince,
};
