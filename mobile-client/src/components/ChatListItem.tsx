import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Conversation } from '../api/chat';

interface Props {
    conversation: Conversation;
    onPress: () => void;
}

export default function ChatListItem({ conversation, onPress }: Props) {
    const name = conversation.type === 'group'
        ? conversation.group_name
        : conversation.other_user_name;

    const initial = (name || '?')[0].toUpperCase();
    const time = conversation.last_message_at
        ? new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b border-wa-header active:bg-wa-hover"
            onPress={onPress}
        >
            <View className="w-14 h-14 bg-wa-header rounded-full items-center justify-center mr-4">
                <Text className="text-wa-text text-xl font-bold">{initial}</Text>
            </View>

            <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-wa-text text-lg font-semibold" numberOfLines={1}>
                        {name || 'User'}
                    </Text>
                    <Text className="text-wa-muted text-xs">{time}</Text>
                </View>

                <View className="flex-row justify-between items-center">
                    <Text className="text-wa-muted text-sm flex-1 mr-2" numberOfLines={1}>
                        {conversation.last_message_text || 'No messages yet'}
                    </Text>
                    {conversation.unread_count > 0 && (
                        <View className="bg-wa-green rounded-full px-2 py-0.5">
                            <Text className="text-white text-[10px] font-bold">
                                {conversation.unread_count}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
