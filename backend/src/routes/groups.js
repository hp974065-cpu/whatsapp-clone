// ============================================
// Group Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const groupService = require('../services/group/groupService');

router.use(authenticate);

/**
 * POST /api/v1/groups
 * Create a new group.
 * Body: { groupName, memberIds: ["uuid1", "uuid2", ...] }
 */
router.post('/', async (req, res, next) => {
    try {
        const { groupName, memberIds } = req.body;
        if (!groupName) return res.status(400).json({ error: 'groupName is required' });

        const group = await groupService.createGroup(req.user.id, groupName, memberIds || []);
        res.status(201).json({ group });
    } catch (err) { next(err); }
});

/**
 * PUT /api/v1/groups/:groupId
 * Update group metadata.
 * Body: { groupName?, groupAvatar? }
 */
router.put('/:groupId', async (req, res, next) => {
    try {
        const group = await groupService.updateGroup(req.params.groupId, req.user.id, req.body);
        res.json({ group });
    } catch (err) { next(err); }
});

/**
 * GET /api/v1/groups/:groupId/members
 */
router.get('/:groupId/members', async (req, res, next) => {
    try {
        const members = await groupService.getGroupMembers(req.params.groupId);
        res.json({ members });
    } catch (err) { next(err); }
});

/**
 * POST /api/v1/groups/:groupId/members
 * Add members to a group.
 * Body: { memberIds: ["uuid1", ...] }
 */
router.post('/:groupId/members', async (req, res, next) => {
    try {
        const { memberIds } = req.body;
        if (!Array.isArray(memberIds)) return res.status(400).json({ error: 'memberIds must be an array' });

        const members = await groupService.addMembers(req.params.groupId, req.user.id, memberIds);
        res.json({ members });
    } catch (err) { next(err); }
});

/**
 * DELETE /api/v1/groups/:groupId/members/:userId
 * Remove a member from a group.
 */
router.delete('/:groupId/members/:userId', async (req, res, next) => {
    try {
        const result = await groupService.removeMember(req.params.groupId, req.user.id, req.params.userId);
        res.json(result);
    } catch (err) { next(err); }
});

module.exports = router;
