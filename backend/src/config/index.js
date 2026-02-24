// ============================================
// Environment Configuration Loader
// ============================================
// Loads .env and exposes typed config object
// ============================================

require('dotenv').config();
const path = require('path');

const config = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',

    // PostgreSQL
    databaseUrl: process.env.DATABASE_URL || 'postgresql://chatuser:chatpass@localhost:5432/whatsapp_clone',

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    jwt: {
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
        privateKeyPath: path.resolve(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem'),
        publicKeyPath: path.resolve(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem'),
    },

    // Twilio OTP
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
    },

    // Media
    media: {
        uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25,
    },

    // CORS
    corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
