# WhatsApp Clone — Backend Server

A production-grade, real-time messaging backend built with **Node.js**, **Express**, **Socket.IO**, **PostgreSQL**, and **Redis**.

## Architecture

```
Client (Android/Web) ──── HTTPS + WSS ────▶ Express + Socket.IO
                                              │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                    Auth Service      Messaging Service     Media Service
                    (OTP + JWT)       (WebSocket + REST)    (Upload + Thumb)
                          │                   │                   │
                          └───────────────────┼───────────────────┘
                                              │
                                    ┌─────────┼─────────┐
                                    │         │         │
                              PostgreSQL    Redis     Storage
                              (7 tables)   (cache)   (uploads/)
```

## Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Docker Desktop** (for PostgreSQL + Redis)

### 1. Start Database Services
```bash
cd whatsapp-clone
docker-compose up -d
```

### 2. Generate RSA Keys (one-time)
```bash
cd backend
npm run generate:keys
```

### 3. Run Database Migration
```bash
npm run db:migrate
```

### 4. Seed Test Data (optional)
```bash
npm run db:seed
```
Creates 3 test users: Alice (+911111111111), Bob (+912222222222), Charlie (+913333333333)

### 5. Start the Server
```bash
npm run dev
```
Server starts at `http://localhost:3000`

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/request-otp` | Request OTP for phone number |
| POST | `/api/v1/auth/verify-otp` | Verify OTP, receive JWT tokens |
| POST | `/api/v1/auth/refresh-token` | Refresh expired access token |
| POST | `/api/v1/auth/logout` | Revoke tokens |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/chat/conversations` | List all conversations |
| GET | `/api/v1/chat/conversations/:id/messages` | Paginated messages |
| POST | `/api/v1/chat/conversations/direct` | Create/find direct chat |
| POST | `/api/v1/chat/conversations/:id/read` | Mark as read |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get own profile |
| PUT | `/api/v1/users/me` | Update profile |
| GET | `/api/v1/users/search?q=` | Search users |
| POST | `/api/v1/users/contacts/sync` | Sync contacts |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/media/upload` | Upload file |
| GET | `/api/v1/media/files/:name` | Download file |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/groups` | Create group |
| PUT | `/api/v1/groups/:id` | Update group |
| POST | `/api/v1/groups/:id/members` | Add members |
| DELETE | `/api/v1/groups/:id/members/:uid` | Remove member |

### WebSocket Events
Connect with: `{ auth: { token: "<accessToken>" } }`

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send a message |
| `message:new` | Server → Client | New message received |
| `message:delivered` | Client → Server | ACK delivery |
| `message:read` | Client → Server | Mark conversation read |
| `message:status` | Server → Client | Status update (delivered/read) |
| `typing:start/stop` | Bidirectional | Typing indicators |
| `sync:request` | Client → Server | Sync after reconnect |

---

## Testing the Auth Flow

```bash
# 1. Request OTP (dev mode: OTP is always 123456)
curl -X POST http://localhost:3000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+911111111111"}'

# 2. Verify OTP
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+911111111111", "otp": "123456", "deviceId": "test-device-1"}'

# 3. Use the returned accessToken for authenticated requests
curl http://localhost:3000/api/v1/chat/conversations \
  -H "Authorization: Bearer <accessToken>"
```

## Project Structure

```
backend/
├── src/
│   ├── server.js                 # Main entry point
│   ├── config/index.js           # Environment config
│   ├── db/
│   │   ├── index.js              # PostgreSQL pool
│   │   ├── redis.js              # Redis client
│   │   ├── migrate.js            # Schema migration
│   │   └── seed.js               # Test data
│   ├── middleware/
│   │   ├── auth.js               # JWT validation
│   │   └── errorHandler.js       # Error handling
│   ├── routes/
│   │   ├── auth.js               # Auth endpoints
│   │   ├── chat.js               # Chat endpoints
│   │   ├── users.js              # User endpoints
│   │   ├── media.js              # Media endpoints
│   │   └── groups.js             # Group endpoints
│   ├── services/
│   │   ├── auth/authService.js
│   │   ├── messaging/
│   │   │   ├── messagingService.js
│   │   │   └── socketHandler.js
│   │   ├── media/mediaService.js
│   │   ├── user/userService.js
│   │   └── group/groupService.js
│   └── utils/jwt.js              # JWT helpers
├── scripts/generate-keys.js      # RSA key generator
├── keys/                         # Generated RSA keys
├── uploads/                      # Media storage
├── .env                          # Environment vars
└── package.json
```

## Security Features

- **RS256 JWT** with asymmetric signing (private/public key pair)
- **One-time-use refresh tokens** with family revocation on reuse
- **Bcrypt-hashed OTPs** with max 3 attempts + cooldown
- **Rate limiting** (500 requests / 15 min per IP)
- **Helmet** security headers
- **Input validation** on all endpoints
- **Device binding** in JWT claims
