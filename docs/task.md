# WhatsApp Clone — Build Task List

## Phase 1: Backend Foundation
- [x] Project scaffolding (Node.js + Express)
- [x] Database schema migration (all 7 tables — SQLite)
- [x] Environment config and secrets management
- [x] **Removed Docker dependency**: SQLite + in-memory cache

## Phase 2: Auth Service
- [x] OTP request endpoint (`POST /auth/request-otp`)
- [x] OTP verify endpoint (`POST /auth/verify-otp`)
- [x] JWT token generation (RS256 access + opaque refresh)
- [x] Token refresh endpoint (`POST /auth/refresh-token`)
- [x] Logout + token revocation
- [x] Auth middleware (JWT validation)

## Phase 3: Messaging Service
- [x] WebSocket server (Socket.IO)
- [x] `message:send` handler with DB write
- [x] `message:delivered` and `message:read` ACK handlers
- [x] Message history REST endpoint (paginated)
- [x] Conversation list endpoint with last message preview
- [x] Presence tracking (online/offline/last-seen)
- [x] Offline message sync via `sync:request` event

## Phase 4: Media Service
- [x] File upload endpoint (multipart, validation)
- [x] Local storage with serve endpoint
- [x] MIME type validation + file size limits
- [x] Thumbnail generation for images (Sharp)

## Phase 5: Group Chat
- [x] Group CRUD endpoints
- [x] Member management (add/remove with admin check)
- [x] Group message fan-out via WebSocket

## Phase 6: Verification
- [x] Install dependencies and generate RSA keys
- [x] Run database migration and seed (SQLite)
- [x] Start server — **works without Docker!**
- [x] Test auth flow end-to-end (OTP → JWT ✅)
- [x] Health endpoint verified (status: ok)

## Phase 7: Android Client (React Native + Expo)
- [x] Initialize Expo project with TypeScript
- [x] Configure Tailwind CSS (NativeWind)
- [x] Setup API client (Axios + secure storage)
- [x] Implement Auth Screens (Login, OTP)
- [x] Implement Main Navigation (Bottom Tabs)
- [x] Implement Chat List Screen
- [x] Implement Conversation (Message) Screen
- [x] Integrate Socket.IO for real-time messaging
- [x] Implement Media Uploads / Display
- [x] Final Verification & APK Build

## Phase 8: Mobile Polish & Advanced Features
- [x] Implement Settings & Profile Screen
- [x] Implement User Search (New Chat)
- [x] Implement Presence Tracking (Online/Typing indicators)
- [x] Add Custom Icons and UI Refinements
- [x] Initialize Git Repository and Push to GitHub

## Phase 9: Mobile Polish & Group Features
- [ ] Implement Profile Editing Screen (Name, Status, Avatar)
- [ ] Implement Group Creation UI
- [ ] Implement Group Info / Member List Screen
- [ ] Add Basic Call Logs Placeholder Logic
