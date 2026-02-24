// ============================================
// User Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userService = require('../services/user/userService');

router.use(authenticate);

/**
 * GET /api/v1/users/me
 */
router.get('/me', async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (err) { next(err); }
});

/**
 * PUT /api/v1/users/me
 * Body: { displayName?, avatarUrl?, statusText? }
 */
router.put('/me', async (req, res, next) => {
    try {
        const user = await userService.updateProfile(req.user.id, req.body);
        res.json({ user });
    } catch (err) { next(err); }
});

/**
 * POST /api/v1/users/contacts/sync
 * Body: { phoneNumbers: ["+91...", "+91..."] }
 */
router.post('/contacts/sync', async (req, res, next) => {
    try {
        const { phoneNumbers } = req.body;
        if (!Array.isArray(phoneNumbers)) {
            return res.status(400).json({ error: 'phoneNumbers must be an array' });
        }
        const contacts = await userService.syncContacts(phoneNumbers);
        res.json({ contacts });
    } catch (err) { next(err); }
});

/**
 * GET /api/v1/users/search?q=<query>
 */
router.get('/search', async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
        const users = await userService.searchUsers(q, req.user.id);
        res.json({ users });
    } catch (err) { next(err); }
});

/**
 * GET /api/v1/users/:userId
 */
router.get('/:userId', async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (err) { next(err); }
});

module.exports = router;
