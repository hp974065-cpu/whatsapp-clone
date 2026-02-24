# Android Client Implementation Plan

We will build the WhatsApp clone mobile app using **React Native (Expo)**. This ensures fast development, cross-platform compatibility, and a smooth developer experience.

## Proposed Tech Stack
- **Framework**: React Native + Expo (TypeScript)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **State Management**: React Query (Server state) + Zustand (Local UI state)
- **API Client**: Axios
- **Real-time**: Socket.io-client
- **Storage**: Expo Secure Store (for JWTs)

## Proposed Changes

### [NEW] [mobile-client](file:///C:/Users/Haripriya/.gemini/antigravity/scratch/whatsapp-clone/mobile-client)

#### [NEW] Navigation Architecture
- `AuthStack`: Phone Input → OTP Verify
- `AppStack` (Authenticated):
  - Bottom Tabs: Chats, Status, Calls, Settings
  - Screens: ConversationView, ProfileEditor, NewChat

#### [NEW] Feature Components
- `ChatListItem`: Swipeable list item with last message and unread count
- `MessageBubble`: Sent/Received bubbles with delivery status ticks
- `MediaHandler`: Image/Video picker and previewer
- `PresenceIndicator`: Real-time online/typing status

## Verification Plan

### Automated Tests
- Integration tests for auth flow redirects.
- Socket.io connection and message delivery verification.

### Manual Verification
- Testing on Android Emulator.
- Real-time interaction between Web Client and Android Client.
- Media upload/download testing.

## Phase 8: Mobile Polish & Advanced Features
### Settings & Profile
- View current user profile (Name, Phone, Status).
- Logout functionality.

### User Discovery
- Search users by name or phone.
- Start new chat from search results.

### Real-time Presence
- Online / Last Seen status in chat header.
- Typing indicators in chat list and header.

## Phase 9: Mobile Polish & Group Features

### Profile Management
- `ProfileScreen`: Update display name and status text.
- Integrated with `userApi.updateProfile`.

### Group Features
- Create new groups from `NewChatScreen`.
- View group details and participant list.

### UI Polish
- Add unread message sound (simulated or real).
- Better transition animations.

> [!IMPORTANT]
> The mobile client will need to connect to the backend. If using an Android Emulator, the server URL will be `http://10.0.2.2:3000` instead of `localhost`.
