// ============================================
// WhatsApp Clone — Main Server
// ============================================
// Boots Express + Socket.IO with SQLite
// and in-memory cache. No Docker needed!
// ============================================

const express = require('express');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const db = require('./db');
const { connectRedis } = require('./db/redis');
const { setupSocketHandlers } = require('./services/messaging/socketHandler');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const mediaRoutes = require('./routes/media');
const groupRoutes = require('./routes/groups');

async function startServer() {
    // ── Express App ──
    const app = express();
    const server = http.createServer(app);

    // ── Global Middleware ──
    app.use(helmet({
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                connectSrc: ["'self'", "ws:", "wss:"],
                imgSrc: ["'self'", "data:", "blob:"],
            },
        },
    }));
    app.use(cors({ origin: config.corsOrigin }));
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan('dev'));

    // Rate limiting
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
    }));

    // ── Serve Web Client ──
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // ── Initialize Data Stores ──
    console.log('[Server] SQLite database ready');

    console.log('[Server] Initializing cache...');
    await connectRedis();
    console.log('[Server] ✅ In-memory cache ready');

    // ── Mount REST Routes ──
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/chat', chatRoutes);
    app.use('/api/v1/users', userRoutes);
    app.use('/api/v1/media', mediaRoutes);
    app.use('/api/v1/groups', groupRoutes);

    // ── Health Check ──
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            services: {
                database: 'sqlite (local)',
                cache: 'in-memory',
            },
        });
    });

    // ── Error Handler ──
    app.use(errorHandler);

    // ── Socket.IO ──
    const io = new SocketServer(server, {
        cors: {
            origin: config.corsOrigin,
            methods: ['GET', 'POST'],
        },
        pingInterval: 25000,
        pingTimeout: 60000,
    });

    setupSocketHandlers(io);

    // ── Start Listening ──
    server.listen(config.port, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║     WhatsApp Clone - Running!                    ║
║     http://localhost:${config.port}                      ║
║     No Docker needed 🎉                         ║
╚══════════════════════════════════════════════════╝
    `);
        console.log('[Server] 🌐 Open: http://localhost:' + config.port);
    });
}

// ── Boot ──
startServer().catch((err) => {
    console.error('[Server] ❌ Failed to start:', err.message);
    console.error(err.stack);
    process.exit(1);
});
