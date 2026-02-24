// ============================================
// Group Service — SQLite Edition
// ============================================
// Handles group CRUD, member management.
// ============================================

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

/**
 * Create a new group conversation.
 */
async function createGroup(creatorId, groupName, memberIds = []) {
    const convId = uuidv4();

    // Create group conversation
    db.query(
        `INSERT INTO conversations (id, type, group_name, created_by) VALUES (?, 'group', ?, ?)`,
        [convId, groupName, creatorId]
    );

    // Add creator as admin
    db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'admin')`,
        [convId, creatorId]
    );

    // Add other members
    const allMembers = [...new Set(memberIds.filter(id => id !== creatorId))];
    for (const memberId of allMembers) {
        db.query(
            `INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')`,
            [convId, memberId]
        );
    }

    // Get full member list
    const members = await getGroupMembers(convId);
    const conv = db.query(`SELECT * FROM conversations WHERE id = ?`, [convId]);
    return { ...conv.rows[0], members };
}

/**
 * Update group metadata.
 */
async function updateGroup(groupId, userId, { groupName, groupAvatar }) {
    // Verify user is a member
    const memberResult = db.query(
        `SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
        [groupId, userId]
    );

    if (memberResult.rows.length === 0) {
        throw Object.assign(new Error('Not a group member'), { statusCode: 403 });
    }

    const fields = [];
    const values = [];

    if (groupName !== undefined) { fields.push('group_name = ?'); values.push(groupName); }
    if (groupAvatar !== undefined) { fields.push('group_avatar = ?'); values.push(groupAvatar); }

    if (fields.length === 0) return null;

    values.push(groupId);
    db.query(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values);

    const result = db.query(`SELECT * FROM conversations WHERE id = ?`, [groupId]);
    return result.rows[0];
}

/**
 * Add members to a group.
 */
async function addMembers(groupId, adminId, newMemberIds) {
    // Verify membership
    const adminCheck = db.query(
        `SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
        [groupId, adminId]
    );
    if (adminCheck.rows.length === 0) {
        throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
    }

    for (const memberId of newMemberIds) {
        db.query(
            `INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')`,
            [groupId, memberId]
        );
    }

    return getGroupMembers(groupId);
}

/**
 * Remove a member from a group.
 */
async function removeMember(groupId, adminId, targetUserId) {
    if (adminId !== targetUserId) {
        const adminCheck = db.query(
            `SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ? AND role = 'admin'`,
            [groupId, adminId]
        );
        if (adminCheck.rows.length === 0) {
            throw Object.assign(new Error('Only admins can remove members'), { statusCode: 403 });
        }
    }

    db.query(
        `DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
        [groupId, targetUserId]
    );
    return { success: true };
}

/**
 * Get all members of a group.
 */
async function getGroupMembers(groupId) {
    const result = db.query(
        `SELECT u.id, u.phone_number, u.display_name, u.avatar_url,
            cm.role, cm.joined_at
     FROM conversation_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.conversation_id = ?
     ORDER BY cm.role DESC, cm.joined_at ASC`,
        [groupId]
    );
    return result.rows;
}

module.exports = { createGroup, updateGroup, addMembers, removeMember, getGroupMembers };
