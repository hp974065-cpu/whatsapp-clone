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
- **Group Management**: Full multi-select group creation and info/member management.
- **Profile Customization**: Update display name, status text, and avatar.
- **Complete UI**: Functional (placeholder) Status and Calls tabs for a complete user experience.
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
- **GitHub**: [Link to Repository](https://github.com/hp974065-cpu/whatsapp-clone.git)

### 🛠️ Developer Credentials
- **Phone**: `+911111111111`
- **OTP**: `123456`

## 🏗️ Architecture Layers
- **Backend**: Node.js, Express, Socket.IO, Better-SQLite3.
- **Mobile**: React Native, Expo, NativeWind, React Query, Zustand.

## ✅ Verification Check
- [x] Backend runs without Docker.
- [x] Web Client works.
- [x] Mobile Client project is fully functional.
- [x] Real-time messaging and presence enabled.
- [x] Group chat creation and management functional.
- [x] Profile editing and media uploads verified.
- [x] Code pushed to GitHub.
