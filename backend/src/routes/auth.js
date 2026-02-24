// ============================================
// Auth Routes
// ============================================

const express = require('express');
const router = express.Router();
const authService = require('../services/auth/authService');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/v1/auth/request-otp
 * Body: { phoneNumber: "+91XXXXXXXXXX" }
 */
router.post('/request-otp', async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({ error: 'phoneNumber is required' });
        }

        // Basic phone number validation
        const phoneRegex = /^\+[1-9]\d{6,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number format. Use E.164 (e.g., +91XXXXXXXXXX)' });
        }

        const result = await authService.requestOtp(phoneNumber);

        if (!result.success) {
            return res.status(429).json(result);
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/verify-otp
 * Body: { phoneNumber, otp, deviceId }
 */
router.post('/verify-otp', async (req, res, next) => {
    try {
        const { phoneNumber, otp, deviceId } = req.body;

        if (!phoneNumber || !otp || !deviceId) {
            return res.status(400).json({ error: 'phoneNumber, otp, and deviceId are required' });
        }

        const result = await authService.verifyOtp(phoneNumber, otp, deviceId);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/refresh-token
 * Body: { refreshToken, deviceId }
 */
router.post('/refresh-token', async (req, res, next) => {
    try {
        const { refreshToken, deviceId } = req.body;

        if (!refreshToken || !deviceId) {
            return res.status(400).json({ error: 'refreshToken and deviceId are required' });
        }

        const result = await authService.refreshAccessToken(refreshToken, deviceId);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/logout
 * Headers: Authorization: Bearer <accessToken>
 */
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const result = await authService.logout(req.user.id, req.user.deviceId);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
