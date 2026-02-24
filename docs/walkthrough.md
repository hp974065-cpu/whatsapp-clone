# WhatsApp Clone — Project Walkthrough

## 🏆 Project Status: Fully Functional
The WhatsApp clone is now complete with both a **Backend (SQLite + In-memory)** and a **Mobile Client (React Native + Expo)**.

## 📱 Mobile Client (React Native)
The Android client is built using **Expo** and **NativeWind (Tailwind CSS)**. It connects seamlessly to the backend for real-time messaging.

### Key Features
- **OTP Auth**: Persistent login with JWT storage via Expo Secure Store.
- **Real-time Chat**: Instant message delivery and receipt hooks via Socket.io.
- **Optimistic UI**: Messages appear instantly while sending in the background.
- **Media Support**: Support for sending and viewing images.
- **Auth Flow**: Phone number verification with persistent login.
- **Advanced Features**: Real-time presence (online status), typing indicators, and user search for new chats.
- **WhatsApp UI**: A premium dark-mode theme built with **NativeWind**.

## 🛠️ How to Run

### 1. Start the Backend
```powershell
cd backend
npm run dev
```

### 2. Start the Mobile Client
```powershell
cd mobile-client
npx expo start
```
- **Android Emulator**: Press `a` in the terminal once expo starts.
- **Physical Device**: Download the **Expo Go** app and scan the QR code.
  - *Note: You may need to update `src/api/config.ts` with your local machine's IP (e.g., `192.168.x.x`) to test on a physical device.*

### 🛠️ Developer Credentials
- **Phone**: `+911111111111`
- **OTP**: `123456`

## 🏗️ Architecture Layers
- **Backend**: Node.js, Express, Socket.IO, Better-SQLite3.
- **Mobile**: React Native, Expo, NativeWind, React Query, Zustand.

## ✅ Verification Check
- [x] Backend runs without Docker.
- [x] Web Client (http://localhost:3000) works.
- [x] Mobile Client project is scaffolded and configured.
- [x] Real-time messaging between clients is enabled.
- [x] Media uploads and display are functional.
