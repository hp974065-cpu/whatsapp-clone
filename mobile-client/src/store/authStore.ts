import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

// Simple adapter for Web vs Native
const storage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        return SecureStore.setItemAsync(key, value);
    },
    deleteItem: async (key: string) => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        return SecureStore.deleteItemAsync(key);
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    isLoading: true,

    setAuth: async (accessToken, refreshToken, user) => {
        try {
            await Promise.all([
                storage.setItem('accessToken', accessToken),
                storage.setItem('refreshToken', refreshToken),
                storage.setItem('user', JSON.stringify(user)),
            ]);
            set({ accessToken, refreshToken, user, isLoading: false });
        } catch (error) {
            console.error('Failed to save auth state:', error);
        }
    },

    setUser: async (user) => {
        try {
            await storage.setItem('user', JSON.stringify(user));
            set({ user });
        } catch (error) {
            console.error('Failed to save user state:', error);
        }
    },

    clearAuth: async () => {
        try {
            await Promise.all([
                storage.deleteItem('accessToken'),
                storage.deleteItem('refreshToken'),
                storage.deleteItem('user'),
            ]);
            set({ accessToken: null, refreshToken: null, user: null, isLoading: false });
        } catch (error) {
            console.error('Failed to clear auth state:', error);
        }
    },

    loadAuth: async () => {
        try {
            const [accessToken, refreshToken, userStr] = await Promise.all([
                storage.getItem('accessToken'),
                storage.getItem('refreshToken'),
                storage.getItem('user'),
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
