import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { User } from '../../store/authStore';

export default function NewChatScreen({ navigation }: any) {
    const [query, setQuery] = useState('');

    const { data: users, isLoading } = useQuery({
        queryKey: ['userSearch', query],
        queryFn: () => userApi.searchUsers(query),
        enabled: query.length > 0,
    });

    const handleSelectUser = (user: User) => {
        // In a real app, we might check if a conversation already exists
        // For now, we'll navigate to Conversation with a temporary ID or handle it in the next screen
        // But the backend expects a conversationId.
        // We'll create a conversation or handle "new chat" logic.
        navigation.navigate('Conversation', {
            otherUser: user,
            isNew: true
        });
    };

    return (
        <View className="flex-1 bg-wa-bg">
            <View className="p-4 border-b border-wa-header">
                <TextInput
                    className="bg-wa-input p-4 rounded-xl text-wa-text border border-wa-header focus:border-wa-green"
                    placeholder="Search name or number..."
                    placeholderTextColor="#8696a0"
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#00a884" />
                </View>
            ) : (
                <FlatList
                    data={users || []}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <TouchableOpacity
                            className="flex-row items-center p-4 border-b border-wa-header"
                            onPress={() => navigation.navigate('CreateGroup')}
                        >
                            <View className="w-12 h-12 bg-wa-green rounded-full items-center justify-center mr-4">
                                <Text className="text-white text-xl">👥</Text>
                            </View>
                            <Text className="text-wa-text text-lg font-medium">New group</Text>
                        </TouchableOpacity>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="flex-row items-center p-4 border-b border-wa-header active:bg-wa-hover"
                            onPress={() => handleSelectUser(item)}
                        >
                            <View className="w-12 h-12 bg-wa-header rounded-full items-center justify-center mr-4">
                                <Text className="text-wa-text font-bold">
                                    {(item.display_name || '?')[0].toUpperCase()}
                                </Text>
                            </View>
                            <View>
                                <Text className="text-wa-text text-lg font-medium">
                                    {item.display_name || item.phone_number}
                                </Text>
                                <Text className="text-wa-muted text-sm italic">
                                    {item.status_text || 'Hey there! I am using WhatsApp.'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="p-10 items-center">
                            <Text className="text-wa-muted text-center">
                                {query.length > 0 ? 'No users found.' : 'Search for friends to start chatting!'}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
