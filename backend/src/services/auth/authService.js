// ============================================
// Auth Service
// ============================================
// Handles: OTP request/verify, JWT issuance,
// refresh token rotation, logout/revocation.
//
// In dev mode: OTP is simulated (always "123456")
// In production: integrates with Twilio Verify
// ============================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { getRedisClient } = require('../../db/redis');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt');
const config = require('../../config');

// OTP config
const OTP_TTL_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 3;
const OTP_COOLDOWN_SECONDS = 60;

/**
 * Request an OTP for the given phone number.
 */
async function requestOtp(phoneNumber) {
    const redis = getRedisClient();
    const cooldownKey = `otp_cooldown:${phoneNumber}`;

    // Rate limit
    const cooldown = await redis.get(cooldownKey);
    if (cooldown) {
        return { success: false, error: 'Too many requests', retryAfter: 60 };
    }

    if (config.isDev) {
        const otp = '123456';
        const otpHash = await bcrypt.hash(otp, 10);

        await redis.set(`otp:${phoneNumber}`, JSON.stringify({
            hash: otpHash,
            attempts: 0,
        }), { EX: OTP_TTL_SECONDS });

        await redis.set(cooldownKey, '1', { EX: OTP_COOLDOWN_SECONDS });

        console.log(`[Auth] DEV OTP for ${phoneNumber}: ${otp}`);
        return { success: true, message: 'OTP sent (dev mode)', retryAfter: OTP_COOLDOWN_SECONDS };
    }

    return { success: false, error: 'Twilio not configured. Use dev mode.' };
}

/**
 * Verify the OTP and issue tokens.
 */
async function verifyOtp(phoneNumber, otp, deviceId) {
    const redis = getRedisClient();
    const otpKey = `otp:${phoneNumber}`;

    const otpData = await redis.get(otpKey);
    if (!otpData) {
        return { success: false, error: 'OTP expired or not requested' };
    }

    const { hash, attempts } = JSON.parse(otpData);

    if (attempts >= OTP_MAX_ATTEMPTS) {
        await redis.del(otpKey);
        return { success: false, error: 'Too many failed attempts. Request a new OTP.' };
    }

    const isValid = await bcrypt.compare(otp, hash);
    if (!isValid) {
        // Increment attempt — re-set with remaining TTL
        await redis.set(otpKey, JSON.stringify({ hash, attempts: attempts + 1 }), { EX: OTP_TTL_SECONDS });
        return { success: false, error: 'Invalid OTP' };
    }

    // OTP valid — delete it
    await redis.del(otpKey);

    // Check if user exists
    const existing = db.query(
        `SELECT id, phone_number, display_name, avatar_url, status_text, created_at FROM users WHERE phone_number = ?`,
        [phoneNumber]
    );

    let user;
    if (existing.rows.length > 0) {
        user = existing.rows[0];
        // Update last activity
        db.query(`UPDATE users SET updated_at = datetime('now') WHERE id = ?`, [user.id]);
    } else {
        // Create new user
        const userId = uuidv4();
        const displayName = phoneNumber.slice(-4);
        db.query(
            `INSERT INTO users (id, phone_number, display_name) VALUES (?, ?, ?)`,
            [userId, phoneNumber, displayName]
        );
        const newUser = db.query(`SELECT id, phone_number, display_name, avatar_url, status_text, created_at FROM users WHERE id = ?`, [userId]);
        user = newUser.rows[0];
    }

    // Generate tokens
    const accessToken = generateAccessToken(user, deviceId);
    const refreshTokenRaw = generateRefreshToken();
    const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const familyId = uuidv4();

    // Revoke existing tokens for this device
    db.query(
        `UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND device_id = ? AND is_revoked = 0`,
        [user.id, deviceId]
    );

    // Store new refresh token
    db.query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, family_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), user.id, refreshTokenHash, deviceId, familyId, expiresAt]
    );

    return {
        success: true,
        accessToken,
        refreshToken: refreshTokenRaw,
        user: {
            id: user.id,
            phoneNumber: user.phone_number,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            statusText: user.status_text,
        },
    };
}

/**
 * Refresh the access token using a valid refresh token.
 */
async function refreshAccessToken(refreshTokenRaw, deviceId) {
    const now = new Date().toISOString();
    const result = db.query(
        `SELECT id, user_id, token_hash, device_id, family_id, expires_at
     FROM refresh_tokens
     WHERE device_id = ? AND is_revoked = 0 AND expires_at > ?
     ORDER BY created_at DESC`,
        [deviceId, now]
    );

    if (result.rows.length === 0) {
        return { success: false, error: 'No valid refresh token found. Please login again.' };
    }

    let matchedToken = null;
    for (const row of result.rows) {
        const isMatch = await bcrypt.compare(refreshTokenRaw, row.token_hash);
        if (isMatch) {
            matchedToken = row;
            break;
        }
    }

    if (!matchedToken) {
        console.warn(`[Auth] ⚠️  Refresh token reuse detected for device ${deviceId}. Revoking family.`);
        db.query(
            `UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND device_id = ?`,
            [result.rows[0].user_id, deviceId]
        );
        return { success: false, error: 'Security alert: token reuse detected. Please login again.' };
    }

    // Revoke used token
    db.query(`UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?`, [matchedToken.id]);

    // Get user
    const userResult = db.query(
        `SELECT id, phone_number, display_name, avatar_url, status_text FROM users WHERE id = ?`,
        [matchedToken.user_id]
    );
    const user = userResult.rows[0];

    // Issue new token pair
    const accessToken = generateAccessToken(user, deviceId);
    const newRefreshTokenRaw = generateRefreshToken();
    const newRefreshTokenHash = await bcrypt.hash(newRefreshTokenRaw, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    db.query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, family_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), user.id, newRefreshTokenHash, deviceId, matchedToken.family_id, expiresAt]
    );

    return {
        success: true,
        accessToken,
        refreshToken: newRefreshTokenRaw,
    };
}

/**
 * Logout: Revoke all refresh tokens for user's device.
 */
async function logout(userId, deviceId) {
    db.query(
        `UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND device_id = ? AND is_revoked = 0`,
        [userId, deviceId]
    );
    return { success: true };
}

module.exports = { requestOtp, verifyOtp, refreshAccessToken, logout };
