import { Platform } from 'react-native';

// Public HTTPS Tunnel for Vercel testing: https://whatsapp-fix-final-demo.loca.lt
const TUNNEL_URL = 'https://whatsapp-fix-final-demo.loca.lt';

// Use 10.0.2.2 for Android emulator, localhost for others (iOS/Web)
// Adjust this to your local machine IP if testing on physical device
export const BASE_URL = Platform.select({
    android: 'http://10.0.2.2:3000',
    web: TUNNEL_URL, // Use tunnel for Vercel/Web
    default: 'http://localhost:3000',
});

export const API_URL = `${BASE_URL}/api/v1`;
export const WS_URL = BASE_URL;
export const MEDIA_URL = `${API_URL}/media/serve`;
