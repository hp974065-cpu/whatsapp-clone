import client from './client';
import { User } from '../store/authStore';

export const userApi = {
    searchUsers: async (query: string) => {
        const res = await client.get<{ users: User[] }>('/users/search', {
            params: { q: query },
        });
        return res.data.users;
    },
    getMe: async () => {
        const res = await client.get<{ user: User }>('/users/me');
        return res.data.user;
    },
    updateProfile: async (data: Partial<User>) => {
        const res = await client.put<{ user: User }>('/users/me', data);
        return res.data.user;
    },
};
