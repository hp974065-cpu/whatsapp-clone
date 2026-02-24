// ============================================
// WebSocket Handler (Socket.IO)
// ============================================
// Manages real-time messaging connections,
// message send/deliver/read events,
// presence tracking, and sync-on-reconnect.
// ============================================

const { verifyAccessToken } = require('../../utils/jwt');
const messagingService = require('./messagingService');
const { getRedisClient } = require('../../db/redis');

// In-memory map: userId → Set<socketId>
const userSockets = new Map();

/**
 * Initialize Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
function setupSocketHandlers(io) {
    // ── Authentication Middleware ──
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = verifyAccessToken(token);
            socket.userId = decoded.sub;
            socket.deviceId = decoded.deviceId;
            next();
        } catch (err) {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.userId;
        console.log(`[WS] User ${userId} connected (socket: ${socket.id})`);

        // ── Track user's socket ──
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        // Mark user online
        const redis = getRedisClient();
        const presence = {
            status: 'online',
            lastSeen: new Date().toISOString(),
        };
        await redis.set(`presence:${userId}`, JSON.stringify(presence));

        // Broadcast presence to everyone (simple version for discovery)
        io.emit('user:presence', { userId, ...presence });

        // Join user's personal room for targeted delivery
        socket.join(`user:${userId}`);

        // ── Event: message:send ──
        socket.on('message:send', async (data, ack) => {
            try {
                const { conversationId, recipientId, contentType, textContent, mediaUrl, mediaThumbnail, mediaSize, replyTo, clientMessageId } = data;

                // If no conversationId, create/find a direct conversation
                let convId = conversationId;
                if (!convId && recipientId) {
                    const conv = await messagingService.findOrCreateDirectConversation(userId, recipientId);
                    convId = conv.id;
                }

                if (!convId) {
                    return ack?.({ success: false, error: 'conversationId or recipientId required' });
                }

                // Send message
                const message = await messagingService.sendMessage({
                    conversationId: convId,
                    senderId: userId,
                    contentType: contentType || 'text',
                    textContent,
                    mediaUrl,
                    mediaThumbnail,
                    mediaSize,
                    replyTo,
                });

                // ACK to sender with server-assigned ID and timestamp
                ack?.({
                    success: true,
                    message: {
                        id: message.id,
                        clientMessageId,
                        conversationId: convId,
                        status: 'sent',
                        createdAt: message.created_at,
                    },
                });

                // Deliver to all recipients in real-time
                for (const recipientUserId of message.recipients) {
                    io.to(`user:${recipientUserId}`).emit('message:new', {
                        id: message.id,
                        conversationId: convId,
                        senderId: userId,
                        senderName: message.sender_name,
                        senderAvatar: message.sender_avatar,
                        contentType: message.content_type,
                        textContent: message.text_content,
                        mediaUrl: message.media_url,
                        mediaThumbnail: message.media_thumbnail,
                        createdAt: message.created_at,
                        replyTo: message.reply_to,
                    });
                }
            } catch (err) {
                console.error('[WS] message:send error:', err.message);
                ack?.({ success: false, error: err.message });
            }
        });

        // ── Event: message:delivered ──
        socket.on('message:delivered', async (data) => {
            try {
                const { messageId } = data;
                const result = await messagingService.updateMessageStatus(messageId, userId, 'delivered');
                if (result?.sender_id) {
                    io.to(`user:${result.sender_id}`).emit('message:status', {
                        messageId,
                        status: 'delivered',
                    });
                }
            } catch (err) {
                console.error('[WS] message:delivered error:', err.message);
            }
        });

        // ── Event: message:read ──
        socket.on('message:read', async (data) => {
            try {
                const { conversationId } = data;
                const readMessages = await messagingService.markConversationRead(conversationId, userId);

                // Notify each sender that their messages were read
                const senderGroups = {};
                for (const msg of readMessages) {
                    if (!senderGroups[msg.sender_id]) senderGroups[msg.sender_id] = [];
                    senderGroups[msg.sender_id].push(msg.message_id);
                }

                for (const [senderId, messageIds] of Object.entries(senderGroups)) {
                    io.to(`user:${senderId}`).emit('message:status_bulk', {
                        conversationId,
                        messageIds,
                        status: 'read',
                        readAt: new Date().toISOString(),
                    });
                }
            } catch (err) {
                console.error('[WS] message:read error:', err.message);
            }
        });

        // ── Event: typing ──
        socket.on('typing:start', (data) => {
            const { conversationId } = data;
            socket.to(`conv:${conversationId}`).emit('typing:update', {
                userId,
                conversationId,
                isTyping: true,
            });
        });

        socket.on('typing:stop', (data) => {
            const { conversationId } = data;
            socket.to(`conv:${conversationId}`).emit('typing:update', {
                userId,
                conversationId,
                isTyping: false,
            });
        });

        // ── Event: sync:request (reconnect recovery) ──
        socket.on('sync:request', async (data, ack) => {
            try {
                const { lastSyncTimestamp } = data;
                const messages = await messagingService.getMessagesSince(
                    userId,
                    lastSyncTimestamp || new Date(0).toISOString()
                );

                ack?.({ success: true, messages });

                // Auto-deliver all synced messages
                for (const msg of messages) {
                    if (msg.sender_id !== userId && msg.delivery_status === 'sent') {
                        await messagingService.updateMessageStatus(msg.id, userId, 'delivered');
                    }
                }
            } catch (err) {
                console.error('[WS] sync:request error:', err.message);
                ack?.({ success: false, error: err.message });
            }
        });

        // ── Event: join conversation room (for typing indicators) ──
        socket.on('conversation:join', (data) => {
            socket.join(`conv:${data.conversationId}`);
        });

        socket.on('conversation:leave', (data) => {
            socket.leave(`conv:${data.conversationId}`);
        });

        // ── Disconnect ──
        socket.on('disconnect', async () => {
            console.log(`[WS] User ${userId} disconnected (socket: ${socket.id})`);

            // Remove socket from tracking
            userSockets.get(userId)?.delete(socket.id);
            if (userSockets.get(userId)?.size === 0) {
                userSockets.delete(userId);

                // Mark user offline
                const presence = {
                    status: 'offline',
                    lastSeen: new Date().toISOString(),
                };
                await redis.set(`presence:${userId}`, JSON.stringify(presence));
                io.emit('user:presence', { userId, ...presence });
            }
        });
    });
}

/**
 * Check if a user is currently online.
 */
function isUserOnline(userId) {
    return userSockets.has(userId) && userSockets.get(userId).size > 0;
}

module.exports = { setupSocketHandlers, isUserOnline };
