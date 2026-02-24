// ============================================
// Auth Middleware — JWT Validation
// ============================================
// Extracts and validates Bearer token from
// Authorization header. Attaches user to req.
// ============================================

const { verifyAccessToken } = require('../utils/jwt');

/**
 * Express middleware: Authenticate requests via JWT.
 * On success, sets req.user = { id, phone, deviceId }
 * On failure, returns 401.
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Missing or malformed Authorization header',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.sub,
            phone: decoded.phone,
            deviceId: decoded.deviceId,
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Access token has expired. Please refresh.',
            });
        }
        return res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid.',
        });
    }
}

module.exports = { authenticate };
