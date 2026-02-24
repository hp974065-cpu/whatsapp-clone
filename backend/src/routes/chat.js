// ============================================
// Chat / Messaging Routes (REST)
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const messagingService = require('../services/messaging/messagingService');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/chat/conversations
 * Get all conversations for the authenticated user.
 */
router.get('/conversations', async (req, res, next) => {
    try {
        const conversations = await messagingService.getUserConversations(req.user.id);
        res.json({ conversations });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/chat/conversations/:conversationId/messages
 * Get paginated messages for a conversation.
 * Query: ?limit=50&before=<ISO timestamp>
 */
router.get('/conversations/:conversationId/messages', async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const { limit, before } = req.query;

        const messages = await messagingService.getConversationMessages(
            conversationId,
            req.user.id,
            { limit: parseInt(limit) || 50, before }
        );

        res.json({ messages });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/chat/conversations/direct
 * Find or create a direct conversation with another user.
 * Body: { recipientId }
 */
router.post('/conversations/direct', async (req, res, next) => {
    try {
        const { recipientId } = req.body;
        if (!recipientId) {
            return res.status(400).json({ error: 'recipientId is required' });
        }

        const conversation = await messagingService.findOrCreateDirectConversation(
            req.user.id,
            recipientId
        );

        res.json({ conversation });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/chat/conversations/:conversationId/read
 * Mark all messages in a conversation as read.
 */
router.post('/conversations/:conversationId/read', async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const result = await messagingService.markConversationRead(conversationId, req.user.id);
        res.json({ success: true, readCount: result.length });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
