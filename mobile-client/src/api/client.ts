import axios from 'axios';
import { API_URL } from './config';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true', // Required for localtunnel
    },
});

// Request interceptor for adding auth token
client.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling token expiration
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                const deviceId = 'android-client'; // Potentially from a device info lib

                const res = await axios.post(`${API_URL}/auth/refresh-token`, {
                    refreshToken,
                    deviceId,
                });

                if (res.data.success) {
                    const { accessToken, refreshToken: newRefreshToken, user } = res.data;
                    await useAuthStore.getState().setAuth(accessToken, newRefreshToken, user);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return client(originalRequest);
                }
            } catch (refreshError) {
                await useAuthStore.getState().clearAuth();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default client;
