import client from './client';
import { User } from '../store/authStore';

export interface Group {
    id: string;
    group_name: string;
    group_avatar?: string;
    created_by: string;
    created_at: string;
}

export interface GroupMember extends User {
    role: 'admin' | 'member';
    joined_at: string;
}

export const groupApi = {
    createGroup: async (groupName: string, memberIds: string[]) => {
        const res = await client.post<{ group: Group }>('/groups', {
            groupName,
            memberIds,
        });
        return res.data.group;
    },
    updateGroup: async (groupId: string, data: Partial<{ groupName: string, groupAvatar: string }>) => {
        const res = await client.put<{ group: Group }>(`/groups/${groupId}`, data);
        return res.data.group;
    },
    getMembers: async (groupId: string) => {
        const res = await client.get<{ members: GroupMember[] }>(`/groups/${groupId}/members`);
        return res.data.members;
    },
    addMembers: async (groupId: string, memberIds: string[]) => {
        const res = await client.post<{ members: GroupMember[] }>(`/groups/${groupId}/members`, {
            memberIds,
        });
        return res.data.members;
    },
    removeMember: async (groupId: string, userId: string) => {
        const res = await client.delete(`/groups/${groupId}/members/${userId}`);
        return res.data;
    },
};
