import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
    id: string;
    phone_number: string;
    display_name?: string;
    avatar_url?: string;
    status_text?: string;
}

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    isLoading: boolean;
    setAuth: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    setUser: (user: User) => Promise<void>;
    clearAuth: () => Promise<void>;
    loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    isLoading: true,

    setAuth: async (accessToken, refreshToken, user) => {
        try {
            await Promise.all([
                SecureStore.setItemAsync('accessToken', accessToken),
                SecureStore.setItemAsync('refreshToken', refreshToken),
                SecureStore.setItemAsync('user', JSON.stringify(user)),
            ]);
            set({ accessToken, refreshToken, user, isLoading: false });
        } catch (error) {
            console.error('Failed to save auth state:', error);
        }
    },

    setUser: async (user) => {
        try {
            await SecureStore.setItemAsync('user', JSON.stringify(user));
            set({ user });
        } catch (error) {
            console.error('Failed to save user state:', error);
        }
    },

    clearAuth: async () => {
        try {
            await Promise.all([
                SecureStore.deleteItemAsync('accessToken'),
                SecureStore.deleteItemAsync('refreshToken'),
                SecureStore.deleteItemAsync('user'),
            ]);
            set({ accessToken: null, refreshToken: null, user: null, isLoading: false });
        } catch (error) {
            console.error('Failed to clear auth state:', error);
        }
    },

    loadAuth: async () => {
        try {
            const [accessToken, refreshToken, userStr] = await Promise.all([
                SecureStore.getItemAsync('accessToken'),
                SecureStore.getItemAsync('refreshToken'),
                SecureStore.getItemAsync('user'),
            ]);

            set({
                accessToken,
                refreshToken,
                user: userStr ? JSON.parse(userStr) : null,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to load auth state:', error);
            set({ isLoading: false });
        }
    },
}));
