// ============================================
// JWT Utility — Token Generation & Verification
// ============================================
// RS256 signing with asymmetric keys
// ============================================

const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

let privateKey = null;
let publicKey = null;

/**
 * Load RSA keys from disk (lazy, cached).
 */
function loadKeys() {
    if (!privateKey) {
        try {
            privateKey = fs.readFileSync(config.jwt.privateKeyPath, 'utf8');
            publicKey = fs.readFileSync(config.jwt.publicKeyPath, 'utf8');
        } catch (err) {
            console.error('[JWT] Failed to load RSA keys. Run: npm run generate:keys');
            throw err;
        }
    }
}

/**
 * Generate a JWT access token for a user.
 * @param {Object} user - { id, phone_number }
 * @param {string} deviceId
 * @returns {string} signed JWT
 */
function generateAccessToken(user, deviceId) {
    loadKeys();
    return jwt.sign(
        {
            sub: user.id,
            phone: user.phone_number,
            deviceId,
            jti: crypto.randomUUID(), // unique token ID for revocation
        },
        privateKey,
        {
            algorithm: 'RS256',
            expiresIn: config.jwt.accessExpiry,
            issuer: 'whatsapp-clone-api',
        }
    );
}

/**
 * Verify and decode an access token.
 * @param {string} token
 * @returns {Object} decoded payload
 */
function verifyAccessToken(token) {
    loadKeys();
    return jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'whatsapp-clone-api',
    });
}

/**
 * Generate a cryptographically random refresh token (opaque, not JWT).
 * @returns {string} hex-encoded 256-bit token
 */
function generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    generateAccessToken,
    verifyAccessToken,
    generateRefreshToken,
};
