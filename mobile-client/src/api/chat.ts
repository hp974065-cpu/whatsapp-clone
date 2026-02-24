import client from './client';

export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    other_user_name?: string;
    other_user_avatar?: string;
    group_name?: string;
    group_avatar?: string;
    last_message_text?: string;
    last_message_at?: string;
    last_message_sender?: string;
    unread_count: number;
}

export const chatApi = {
    getConversations: async () => {
        const res = await client.get<{ conversations: Conversation[] }>('/chat/conversations');
        return res.data.conversations;
    },
    getMessages: async (conversationId: string, limit = 50) => {
        const res = await client.get<{ messages: any[] }>(`/chat/conversations/${conversationId}/messages`, {
            params: { limit },
        });
        return res.data.messages;
    },
};
