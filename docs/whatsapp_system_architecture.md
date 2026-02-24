# WhatsApp-Like Messaging System — Full Architecture Design

---

## SECTION 1: High-Level Architecture

### System Overview

The system follows a **client-server model** with three fundamental tiers:

| Tier | Role | Technology |
|------|------|------------|
| **Client** | Android native app | Kotlin, Jetpack Compose, Room DB |
| **API Gateway** | Single entry point, TLS termination, rate limiting | Nginx / AWS ALB |
| **Backend Services** | Stateless microservices behind the gateway | Node.js (or Go/Kotlin-Ktor) |
| **Real-Time Layer** | Persistent WebSocket connections | Socket.IO / raw WS on dedicated service |
| **Data Layer** | Persistent storage | PostgreSQL + Redis + S3-compatible storage |
| **Push Layer** | Offline notification delivery | Firebase Cloud Messaging (FCM) |

### Component List

```
┌──────────────────────────────────────────────────────────────────┐
│                        ANDROID CLIENT                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │ Auth UI  │ │ Chat UI  │ │ Media UI │ │ Local DB (Room)   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────────────────┘   │
│       └─────────────┴────────────┘                               │
│                      │  HTTPS + WSS                              │
└──────────────────────┼───────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Nginx / ALB)                    │
│         TLS Termination · Rate Limiting · JWT Validation         │
└──────────────────────┼───────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                            │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ Auth       │ │ Messaging  │ │ Media        │ │ Presence   │  │
│  │ Service    │ │ Service    │ │ Service      │ │ Service    │  │
│  └─────┬──────┘ └─────┬──────┘ └──────┬───────┘ └─────┬──────┘  │
│        └──────────────┴───────────────┴───────────────┘          │
└──────────────────────┼───────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │ PostgreSQL │  │   Redis    │  │  S3 / Minio│                  │
│  │ (primary)  │  │ (cache +   │  │ (media)    │                  │
│  │            │  │  pub/sub)  │  │            │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow: Android → Backend → Receiver

1. **User opens app** → App reads cached JWT from encrypted local storage.
2. **App establishes WSS connection** → Gateway validates JWT, upgrades to WebSocket, routes to Messaging Service.
3. **User sends a message** → Client writes message to local Room DB with status `PENDING`, then emits a `message:send` event over WebSocket.
4. **Messaging Service receives** → Validates JWT claim, writes message row to PostgreSQL with status `SENT`, publishes event on Redis Pub/Sub.
5. **Receiver's WebSocket is connected** → Messaging Service pushes message to receiver in real time, marks status `DELIVERED`.
6. **Receiver is offline** → Messaging Service triggers FCM push notification, message stays `SENT` in DB until receiver reconnects and ACKs.
7. **Receiver reads message** → Client sends `message:read` ACK → Messaging Service updates status to `READ`, notifies sender via WebSocket/push.

---

## SECTION 2: Backend Architecture

### Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **API Framework** | **Node.js + Express** (or Fastify) | High I/O concurrency, massive ecosystem, fast prototyping |
| **Real-Time** | **Socket.IO** (backed by Redis adapter) | Built-in reconnection, room abstraction, horizontal scaling via Redis adapter |
| **Primary DB** | **PostgreSQL 16** | ACID, relational integrity for users/groups/messages, JSONB for metadata |
| **Cache / Pub-Sub** | **Redis 7** | In-memory speed for sessions, presence, and cross-instance pub/sub |
| **Object Storage** | **AWS S3** (or MinIO for self-hosted) | Durable media storage with pre-signed URLs |
| **Push Notifications** | **Firebase Cloud Messaging (FCM)** | Industry standard for Android push |
| **OTP Provider** | **Twilio Verify** (or MSG91) | Reliable SMS OTP delivery |
| **Containerization** | **Docker + Docker Compose** | Reproducible environments |
| **Orchestration** | **Kubernetes** (production) | Auto-scaling, self-healing |

### Services Breakdown

#### 1. Auth Service (`/api/v1/auth/*`)
- `POST /request-otp` — Accepts phone number, calls Twilio to send OTP.
- `POST /verify-otp` — Validates OTP, creates/fetches user, issues JWT access + refresh token pair.
- `POST /refresh-token` — Validates refresh token, rotates and issues new pair.
- `POST /logout` — Revokes refresh token, invalidates session.
- Stores refresh tokens in Redis with TTL.

#### 2. User Service (`/api/v1/users/*`)
- `GET /me` — Returns authenticated user profile.
- `PUT /me` — Updates display name, avatar, status.
- `GET /:userId` — Returns public profile of another user.
- `POST /contacts/sync` — Accepts phone number list, returns registered users.

#### 3. Messaging Service (`/api/v1/messages/*` + WebSocket)
- Manages WebSocket lifecycle (connect, disconnect, heartbeat).
- Handles `message:send`, `message:delivered`, `message:read` events.
- Writes messages to PostgreSQL.
- Publishes events to Redis Pub/Sub for multi-instance fan-out.
- Triggers FCM for offline receivers.

#### 4. Media Service (`/api/v1/media/*`)
- `POST /upload` — Accepts multipart file, validates type/size, stores in S3, returns media URL.
- `GET /presigned/:key` — Returns a short-lived pre-signed download URL.
- Generates thumbnails for images asynchronously (via a worker queue).

#### 5. Group Service (`/api/v1/groups/*`)
- `POST /` — Create group with name, avatar, initial members.
- `PUT /:groupId` — Update group metadata.
- `POST /:groupId/members` — Add members.
- `DELETE /:groupId/members/:userId` — Remove member.
- `GET /:groupId/messages` — Paginated group message history.

#### 6. Presence Service (internal, no public HTTP)
- Tracks online/offline/last-seen per user in Redis.
- Listens to WebSocket connect/disconnect events.
- Exposes internal gRPC or Redis-based API for other services.

### Database Design

#### `users` Table
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number    VARCHAR(20) UNIQUE NOT NULL,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    status_text     VARCHAR(255) DEFAULT 'Hey there! I am using this app.',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_users_phone ON users(phone_number);
```

#### `conversations` Table
```sql
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group')),
    group_name      VARCHAR(100),          -- NULL for direct chats
    group_avatar    TEXT,                   -- NULL for direct chats
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `conversation_members` Table
```sql
CREATE TABLE conversation_members (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(10) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    muted_until     TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
```

#### `messages` Table
```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id),
    content_type    VARCHAR(10) NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'audio', 'document')),
    text_content    TEXT,                   -- for text messages
    media_url       TEXT,                   -- for media messages
    media_thumbnail TEXT,                   -- thumbnail URL
    media_size      BIGINT,                -- file size in bytes
    reply_to        UUID REFERENCES messages(id),  -- for quoted replies
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE   -- soft delete
);
CREATE INDEX idx_messages_conv_time ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

#### `message_status` Table
```sql
CREATE TABLE message_status (
    message_id      UUID REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(10) NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'delivered', 'read')),
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    PRIMARY KEY (message_id, recipient_id)
);
CREATE INDEX idx_msg_status_recipient ON message_status(recipient_id, status);
```

#### `refresh_tokens` Table (or Redis)
```sql
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL,  -- bcrypt hash of token
    device_id       VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_revoked      BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
```

#### `fcm_tokens` Table
```sql
CREATE TABLE fcm_tokens (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id       VARCHAR(255) NOT NULL,
    fcm_token       TEXT NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id)
);
```

### Real-Time Communication Method

**WebSocket (via Socket.IO with Redis Adapter)**

```
Client ↔ WSS ↔ API Gateway ↔ Messaging Service Instance N
                                    │
                            Redis Pub/Sub Adapter
                                    │
                        ┌───────────┼───────────┐
                  Instance 1   Instance 2   Instance 3
```

- Each Messaging Service instance maintains a pool of WebSocket connections.
- When Instance 1 receives a message for a user connected to Instance 3, it publishes to Redis Pub/Sub.
- The Redis Adapter on Instance 3 picks it up and delivers to the correct socket.
- **Heartbeat**: Client sends ping every 25s; server times out after 60s of no pong → marks user offline.

---

## SECTION 3: Android App Architecture

### Architecture Pattern: MVVM + Clean Architecture

```
┌──────────────────────────────────────────────────┐
│                  PRESENTATION                     │
│   Jetpack Compose UI  ←→  ViewModel (StateFlow)  │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                   DOMAIN                          │
│      Use Cases / Interactors (pure Kotlin)        │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                    DATA                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ Remote       │  │ Local        │  │ Socket  │ │
│  │ (Retrofit)   │  │ (Room DB)    │  │ Manager │ │
│  └──────────────┘  └──────────────┘  └─────────┘ │
└──────────────────────────────────────────────────┘
```

### Authentication Flow (Client Side)

1. App starts → Check `EncryptedSharedPreferences` for access token.
2. **Token exists** → Decode JWT, check `exp` claim.
   - **Not expired** → Proceed to home screen, establish WebSocket.
   - **Expired** → Call `POST /refresh-token` with stored refresh token.
     - **Success** → Store new token pair, proceed.
     - **Failure (401)** → Clear tokens, redirect to login screen.
3. **No token** → Show phone number input screen → User enters number → Call `POST /request-otp` → Show OTP input → Call `POST /verify-otp` → Store tokens → Proceed.

### Local Storage Strategy

| Data | Storage | Purpose |
|------|---------|---------|
| JWT tokens | `EncryptedSharedPreferences` | Tamper-resistant credential storage |
| User profile | Room DB (`user` table) | Offline access to own profile |
| Conversations | Room DB (`conversations` table) | Instant chat list rendering |
| Messages | Room DB (`messages` table) | Full offline chat history |
| Media files | Internal storage / cache dir | Image/video caching |
| Pending messages | Room DB with `sync_status = PENDING` | Offline-first message queue |

**Room Database Schema (local mirrors of server tables):**

```kotlin
@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,            // UUID from server (or client-generated)
    val conversationId: String,
    val senderId: String,
    val contentType: String,               // text, image, video, etc.
    val textContent: String?,
    val mediaUrl: String?,
    val mediaThumbnailPath: String?,        // local file path
    val status: String,                    // pending, sent, delivered, read
    val createdAt: Long,                   // epoch millis
    val syncStatus: String                 // PENDING, SYNCED
)
```

### How App Connects to Backend

```kotlin
// 1. REST API via Retrofit
val retrofit = Retrofit.Builder()
    .baseUrl("https://api.yourapp.com/v1/")
    .addConverterFactory(GsonConverterFactory.create())
    .client(okHttpClient)  // interceptor adds Authorization header
    .build()

// 2. WebSocket via Socket.IO client
val socket = IO.socket("wss://ws.yourapp.com", IO.Options().apply {
    auth = mapOf("token" to accessToken)
    reconnection = true
    reconnectionDelay = 1000
    reconnectionDelayMax = 5000
})
socket.connect()
```

**OkHttp Interceptor** automatically attaches JWT and handles 401 refresh:

```kotlin
class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer ${tokenManager.accessToken}")
            .build()
        val response = chain.proceed(request)

        if (response.code == 401) {
            // Attempt token refresh synchronously
            val newToken = tokenManager.refreshTokenBlocking()
            if (newToken != null) {
                val retryRequest = request.newBuilder()
                    .header("Authorization", "Bearer $newToken")
                    .build()
                return chain.proceed(retryRequest)
            }
        }
        return response
    }
}
```

### Reconnect and Offline Message Handling

1. **Socket.IO auto-reconnect** handles transient network drops (exponential backoff 1s → 5s max).
2. **On reconnect**, client sends `sync:request` event with `lastSyncTimestamp` (timestamp of the most recent message in local Room DB).
3. **Server responds** with all messages created after that timestamp → client inserts into Room DB, UI updates via `Flow<List<Message>>`.
4. **Offline send queue**:
   - User types message while offline → Insert into Room DB with `syncStatus = PENDING`.
   - `WorkManager` periodic task (or connectivity broadcast receiver) detects network restored.
   - Worker reads all `PENDING` messages, sends via REST `POST /messages/batch`, marks as `SYNCED` on 200 response.

```
┌─────────┐    ┌──────┐    ┌────────────┐    ┌────────┐
│ Compose  │───▶│ VM   │───▶│ Room DB    │───▶│ Worker │──▶ REST API
│ UI       │◀───│      │◀───│ (PENDING)  │    │ Manager│
└─────────┘    └──────┘    └────────────┘    └────────┘
```

---

## SECTION 4: Authentication Flow

### Step-by-Step Login Process

```mermaid
sequenceDiagram
    participant U as User (Android)
    participant C as Client App
    participant G as API Gateway
    participant A as Auth Service
    participant T as Twilio
    participant R as Redis
    participant DB as PostgreSQL

    U->>C: Enter phone number
    C->>G: POST /auth/request-otp {phone: "+91XXXXXXXXXX"}
    G->>A: Forward (rate-limit check passed)
    A->>T: Send OTP to phone
    T-->>U: SMS with 6-digit OTP
    A->>R: SETEX otp:{phone} 300 {hashedOTP}
    A-->>C: 200 {message: "OTP sent", retryAfter: 60}

    U->>C: Enter OTP
    C->>G: POST /auth/verify-otp {phone, otp}
    G->>A: Forward
    A->>R: GET otp:{phone} → compare hash
    alt OTP valid
        A->>DB: UPSERT user (create if new)
        A->>A: Generate JWT access token (15 min TTL)
        A->>A: Generate refresh token (30 day TTL)
        A->>R: SETEX refresh:{tokenHash} 30d {userId, deviceId}
        A-->>C: 200 {accessToken, refreshToken, user}
    else OTP invalid
        A-->>C: 401 {error: "Invalid OTP"}
    end
```

### OTP Verification Details

| Property | Value |
|----------|-------|
| OTP length | 6 digits |
| OTP TTL | 5 minutes (300 seconds) |
| Max attempts | 3 per OTP (tracked in Redis) |
| Rate limit | 1 OTP request per 60 seconds per phone number |
| Storage | Redis key `otp:{phone}` → `{hash, attempts}` |
| Hashing | bcrypt with cost factor 10 |

### Token Generation

**Access Token (JWT):**
```json
{
  "header": { "alg": "RS256", "typ": "JWT" },
  "payload": {
    "sub": "user-uuid-here",
    "phone": "+91XXXXXXXXXX",
    "deviceId": "android-device-fingerprint",
    "iat": 1708700000,
    "exp": 1708700900,
    "iss": "chat-api"
  }
}
```

- **Algorithm**: RS256 (asymmetric — private key signs, public key verifies at gateway).
- **Expiry**: 15 minutes.
- **Contains**: User ID, phone, device ID (for device binding), issuer.

**Refresh Token:**
- Opaque 256-bit cryptographically random string (not JWT).
- Stored as bcrypt hash in Redis/PostgreSQL.
- TTL: 30 days.
- Bound to `(userId, deviceId)` pair.

### Token Refresh Logic

```
Client                   Auth Service                Redis
  │                           │                         │
  │  POST /auth/refresh       │                         │
  │  {refreshToken, deviceId} │                         │
  │──────────────────────────▶│                         │
  │                           │  GET refresh:{hash}     │
  │                           │────────────────────────▶│
  │                           │  {userId, deviceId}     │
  │                           │◀────────────────────────│
  │                           │                         │
  │           ┌───────────────┤ Validate:               │
  │           │               │  - token not revoked     │
  │           │               │  - deviceId matches      │
  │           │               │  - not expired            │
  │           └───────────────┤                         │
  │                           │                         │
  │                           │  DEL refresh:{oldHash}  │
  │                           │────────────────────────▶│
  │                           │  SETEX refresh:{newHash}│
  │                           │────────────────────────▶│
  │                           │                         │
  │  {newAccessToken,         │                         │
  │   newRefreshToken}        │                         │
  │◀──────────────────────────│                         │
```

**Rotation policy**: Every refresh consumes the old token (one-time use). If a stolen refresh token is replayed after the legitimate user already refreshed, the server detects the old token is already consumed → **revokes the entire token family** for that device → forces re-login.

---

## SECTION 5: Message Delivery Lifecycle

### Full Lifecycle Diagram

```
SENDER APP          SERVER              RECEIVER APP
    │                  │                      │
    │ 1. User taps    │                      │
    │    "Send"       │                      │
    │                  │                      │
    │ 2. Write to     │                      │
    │    Room DB      │                      │
    │    status=      │                      │
    │    PENDING (🕐) │                      │
    │                  │                      │
    │ 3. Emit WS ─────▶ 4. Validate JWT     │
    │    message:send  │    Parse message     │
    │                  │                      │
    │                  │ 5. Write to          │
    │                  │    PostgreSQL        │
    │                  │    status=SENT (✓)   │
    │                  │                      │
    │ 6. ACK ◀─────────│    emit message:ack  │
    │    Update local  │    {id, status:SENT} │
    │    status=SENT   │                      │
    │    Show ✓        │                      │
    │                  │                      │
    │                  │ 7. Is receiver       │
    │                  │    online?           │
    │                  │    ┌─── YES ─────────▶ 8. Push via WS
    │                  │    │                  │    Insert to Room DB
    │                  │    │                  │
    │                  │    │                  │ 9. ACK delivered
    │                  │    │                  │────▶ Update DB
    │ 10. notify ◀─────│────│──────────────────│    status=DELIVERED
    │     sender       │    │                  │
    │     status=      │    │                  │
    │     DELIVERED(✓✓)│    │                  │
    │                  │    │                  │
    │                  │    │                  │ 11. User opens chat
    │                  │    │                  │     ACK read
    │                  │    │                  │────▶ Update DB
    │ 12. notify ◀─────│────│──────────────────│    status=READ
    │     sender       │    │                  │
    │     status=      │    │                  │
    │     READ (✓✓ 🔵) │    │                  │
    │                  │    │                  │
    │                  │    └─── NO            │
    │                  │    7b. Queue FCM push │
    │                  │    Store msg (SENT)   │
    │                  │                      │
    │                  │    ... receiver       │
    │                  │    comes online ...   │
    │                  │                      │
    │                  │    Receiver sends     │
    │                  │    sync:request ──────▶ Fetch missed msgs
    │                  │                      │ Bulk insert Room DB
    │                  │                      │ Bulk ACK delivered
    │                  │◀─────────────────────│
    │ bulk status ◀────│                      │
    │ updates          │                      │
```

### What Happens If Receiver is Offline

1. **Server writes message** to PostgreSQL with `status = SENT`.
2. **Server checks presence** in Redis → user not in online set.
3. **Server sends FCM push** notification:
   ```json
   {
     "to": "<fcm_token>",
     "data": {
       "type": "new_message",
       "conversationId": "...",
       "senderName": "Alice",
       "preview": "Hey, are you free tonight?"
     },
     "android": {
       "priority": "high"
     }
   }
   ```
4. **Android receives push** → Shows notification with sender name and preview.
5. **User taps notification or opens app later** → App establishes WebSocket → Sends `sync:request` with `lastSyncTimestamp`.
6. **Server queries**: `SELECT * FROM messages WHERE conversation_id IN (...) AND created_at > $lastSync ORDER BY created_at ASC`.
7. **Server pushes batch** to client → Client inserts all into Room DB → Room's `Flow` triggers UI recomposition.
8. **Client sends batch ACK** → Server updates all to `DELIVERED` → Notifies all senders.

---

## SECTION 6: Security Design

### JWT Usage

| Aspect | Implementation |
|--------|---------------|
| **Algorithm** | RS256 (RSA 2048-bit) — asymmetric signing |
| **Access token TTL** | 15 minutes |
| **Refresh token TTL** | 30 days |
| **Key rotation** | JWKS endpoint; rotate signing keys every 90 days with a 24-hour overlap |
| **Validation point** | API Gateway validates signature + `exp` + `iss` claims before forwarding |
| **Revocation** | Maintain a Redis blacklist of revoked `jti` (JWT ID) values for active tokens; checked at gateway |

### Encryption Model

```
┌──────────────────────────────────────────────────────┐
│              ENCRYPTION LAYERS                        │
│                                                      │
│  Layer 1: Transport (TLS 1.3)                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  All HTTP and WebSocket traffic over TLS 1.3 │    │
│  │  Certificate pinning on Android client       │    │
│  │  HSTS enforced at gateway                    │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Layer 2: Application-Level Encryption               │
│  ┌──────────────────────────────────────────────┐    │
│  │  Sensitive fields (media URLs, tokens)       │    │
│  │  encrypted at rest with AES-256-GCM          │    │
│  │  Keys managed via AWS KMS / Vault            │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Layer 3: End-to-End Encryption (Phase 2)            │
│  ┌──────────────────────────────────────────────┐    │
│  │  Signal Protocol (Double Ratchet)            │    │
│  │  X25519 key exchange + AES-256-CBC + HMAC    │    │
│  │  Server stores only ciphertext               │    │
│  │  Key bundles stored server-side for async    │    │
│  │  session initiation                          │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> E2E encryption (Layer 3) is a Phase 2 feature. For MVP, Layers 1 and 2 provide strong security. The database schema and message format are designed to accommodate E2E encryption without schema changes — `text_content` simply stores ciphertext instead of plaintext.

### Device Binding

- Each login generates a `deviceId` (Android's `ANDROID_ID` + app-specific salt, hashed with SHA-256).
- The `deviceId` is embedded in the JWT payload and stored alongside the refresh token.
- At refresh time, the server validates that the requesting `deviceId` matches the stored one.
- A user can be logged in on **one device at a time** (WhatsApp model). Logging in on a new device revokes all tokens for the old device.

### Protection Against Replay Attacks

| Attack Vector | Mitigation |
|--------------|------------|
| **Replay of old JWT** | Short TTL (15 min) + `jti` claim (unique per token) + server-side blacklist for revoked tokens |
| **Replay of OTP** | OTP deleted from Redis after first successful verification. Max 3 attempts. |
| **Replay of refresh token** | One-time use: consumed on refresh, new token issued. Replaying old token triggers family revocation. |
| **Replay of WebSocket messages** | Each message has a unique client-generated UUID (`idempotencyKey`). Server deduplicates using a Redis set with 24-hour TTL: `SADD seen_msgs:{idempotencyKey}` → if already exists, ignore. |
| **Man-in-the-middle** | TLS 1.3 + certificate pinning on Android (OkHttp `CertificatePinner`). |
| **Token theft from device** | `EncryptedSharedPreferences` backed by Android Keystore hardware. Root detection via SafetyNet/Play Integrity API. |

---

## SECTION 7: Deployment Architecture

### Docker Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  # --- API Gateway ---
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/ssl/certs
    depends_on:
      - auth-service
      - messaging-service
      - media-service

  # --- Backend Services ---
  auth-service:
    build: ./services/auth
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/chatdb
      - REDIS_URL=redis://redis:6379
      - TWILIO_ACCOUNT_SID=${TWILIO_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_TOKEN}
      - JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private
    secrets:
      - jwt_private
    deploy:
      replicas: 2
      resources:
        limits: { cpus: "0.5", memory: 512M }

  messaging-service:
    build: ./services/messaging
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/chatdb
      - REDIS_URL=redis://redis:6379
      - FCM_CREDENTIALS_PATH=/run/secrets/fcm_creds
    secrets:
      - fcm_creds
    deploy:
      replicas: 3
      resources:
        limits: { cpus: "1.0", memory: 1G }

  media-service:
    build: ./services/media
    environment:
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_KEY}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET}
    deploy:
      replicas: 2
      resources:
        limits: { cpus: "0.5", memory: 512M }

  # --- Data Layer ---
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chatdb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    deploy:
      resources:
        limits: { cpus: "1.0", memory: 2G }

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:

secrets:
  jwt_private:
    file: ./secrets/jwt_private.pem
  fcm_creds:
    file: ./secrets/firebase-adminsdk.json
```

### Cloud Hosting Suggestion

| Tier | Recommended | Alternative |
|------|------------|-------------|
| **Compute** | AWS ECS Fargate (serverless containers) | GCP Cloud Run, Azure Container Apps |
| **Database** | AWS RDS PostgreSQL (Multi-AZ) | GCP Cloud SQL, Supabase |
| **Cache** | AWS ElastiCache Redis | GCP Memorystore |
| **Object Storage** | AWS S3 | GCP Cloud Storage |
| **CDN** | CloudFront (for media) | Cloudflare R2 |
| **Push** | FCM (mandatory for Android) | — |
| **DNS + TLS** | Route 53 + ACM | Cloudflare |
| **Monitoring** | CloudWatch + Grafana | Datadog |

### Load Balancer Configuration

```
                    Internet
                       │
                 ┌─────▼─────┐
                 │  AWS ALB   │  ← TLS termination
                 │  (Layer 7) │  ← Path-based routing
                 └─────┬──────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
    /api/v1/auth/*   /api/v1/msg/*  /api/v1/media/*
          │            │            │
    ┌─────▼────┐ ┌─────▼────┐ ┌────▼─────┐
    │ Auth TG  │ │  Msg TG  │ │ Media TG │
    │ (2 inst) │ │ (3 inst) │ │ (2 inst) │
    └──────────┘ └──────────┘ └──────────┘

    TG = Target Group (health check: GET /health → 200)
```

**WebSocket routing**: ALB supports WebSocket upgrades natively. The Messaging Service target group uses **sticky sessions** (cookie-based) to ensure a client's WebSocket stays on the same instance for the session duration. Cross-instance messaging is handled by the Redis Pub/Sub adapter.

### Horizontal Scaling Approach

```mermaid
graph TD
    subgraph Auto-Scaling Strategy
        A[CloudWatch Metrics] --> B{CPU > 70% OR<br/>Active Connections > 10K?}
        B -->|Yes| C[Scale OUT: Add Instance]
        B -->|No| D{CPU < 20% AND<br/>Connections < 2K?}
        D -->|Yes| E[Scale IN: Remove Instance]
        D -->|No| F[No Action]
    end

    subgraph Stateless Design Principles
        G[No server-side session state]
        H[JWT validated at gateway]
        I[Redis Pub/Sub for cross-instance comms]
        J[S3 for media - shared across all instances]
        K[PostgreSQL as single source of truth]
    end
```

**Scaling parameters by service:**

| Service | Min | Max | Scale-Out Trigger | Scale-In Trigger |
|---------|-----|-----|-------------------|------------------|
| Auth | 2 | 6 | CPU > 70% for 2 min | CPU < 20% for 10 min |
| Messaging | 3 | 20 | Active WS connections > 10K per instance | Connections < 2K for 10 min |
| Media | 2 | 10 | Request queue depth > 100 | Queue depth < 10 for 10 min |

**Key design decisions enabling horizontal scaling:**

1. **Stateless services** — No in-memory sessions. All state lives in PostgreSQL/Redis.
2. **Redis Pub/Sub adapter** — WebSocket messages fan out across all Messaging instances automatically.
3. **Database connection pooling** — PgBouncer (or RDS Proxy) limits connection count to PostgreSQL regardless of instance count.
4. **Idempotent operations** — Message UUID deduplication ensures safe retries during scaling events.
5. **Queue-based media processing** — Media transcoding/thumbnail generation offloaded to SQS + Lambda workers, decoupled from the request path.

---

## Summary: Build Order Recommendation

| Phase | Scope | Duration (est.) |
|-------|-------|-----------------|
| **Phase 1 — MVP** | Auth (OTP + JWT), 1-to-1 text chat, basic chat list, message status ticks | 4–6 weeks |
| **Phase 2 — Media** | Image/video upload, thumbnails, document sharing, media viewer | 2–3 weeks |
| **Phase 3 — Groups** | Group creation, member management, group messaging | 2–3 weeks |
| **Phase 4 — Polish** | Typing indicators, online/last-seen, read receipts in groups, push notification improvements | 2 weeks |
| **Phase 5 — Security** | E2E encryption (Signal Protocol), certificate pinning, Play Integrity | 3–4 weeks |
| **Phase 6 — Scale** | Kubernetes migration, auto-scaling, CDN for media, database read replicas | 2–3 weeks |
