import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../api/chat';
import ChatListItem from '../../components/ChatListItem';

export default function ChatListScreen({ navigation }: any) {
    const { data: conversations, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['conversations'],
        queryFn: chatApi.getConversations,
    });

    if (isLoading) {
        return (
            <View className="flex-1 bg-wa-bg justify-center items-center">
                <ActivityIndicator size="large" color="#00a884" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-wa-bg">
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ChatListItem
                        conversation={item}
                        onPress={() => navigation.navigate('Conversation', {
                            conversationId: item.id,
                            otherUser: {
                                display_name: item.other_user_name,
                                avatar_url: item.other_user_avatar
                            }
                        })}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        tintColor="#00a884"
                    />
                }
                ListEmptyComponent={
                    <View className="p-10 items-center">
                        <Text className="text-wa-muted text-center">
                            No conversations yet. Start a new chat!
                        </Text>
                    </View>
                }
            />

            {/* NEW CHAT FAB */}
            <TouchableOpacity
                className="absolute bottom-6 right-6 bg-wa-green w-14 h-14 rounded-full items-center justify-center shadow-lg"
                onPress={() => navigation.navigate('NewChat')}
            >
                <Text className="text-white text-2xl font-bold">💬</Text>
            </TouchableOpacity>
        </View>
    );
}
