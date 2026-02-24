import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { User } from '../../store/authStore';

export default function CreateGroupScreen({ navigation }: any) {
    const [query, setQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

    const { data: users, isLoading } = useQuery({
        queryKey: ['userSearch', query],
        queryFn: () => userApi.searchUsers(query),
        enabled: query.length > 0,
    });

    const toggleUser = (user: User) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleNext = () => {
        if (selectedUsers.length === 0) return;
        navigation.navigate('GroupFinalize', {
            members: selectedUsers
        });
    };

    return (
        <View className="flex-1 bg-wa-bg">
            <View className="p-4 border-b border-wa-header">
                {selectedUsers.length > 0 && (
                    <View className="flex-row flex-wrap mb-4">
                        {selectedUsers.map(user => (
                            <TouchableOpacity
                                key={user.id}
                                className="bg-wa-header rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center"
                                onPress={() => toggleUser(user)}
                            >
                                <Text className="text-wa-text text-sm mr-2">{user.display_name}</Text>
                                <Text className="text-wa-muted">✕</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                <TextInput
                    className="bg-wa-input p-4 rounded-xl text-wa-text border border-wa-header focus:border-wa-green"
                    placeholder="Search name or number..."
                    placeholderTextColor="#8696a0"
                    value={query}
                    onChangeText={setQuery}
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
                    renderItem={({ item }) => {
                        const isSelected = selectedUsers.some(u => u.id === item.id);
                        return (
                            <TouchableOpacity
                                className={`flex-row items-center p-4 border-b border-wa-header ${isSelected ? 'bg-wa-hover' : ''}`}
                                onPress={() => toggleUser(item)}
                            >
                                <View className="w-12 h-12 bg-wa-header rounded-full items-center justify-center mr-4">
                                    <Text className="text-wa-text font-bold text-lg">
                                        {(item.display_name || '?')[0].toUpperCase()}
                                    </Text>
                                    {isSelected && (
                                        <View className="absolute -bottom-1 -right-1 bg-wa-green w-5 h-5 rounded-full items-center justify-center border-2 border-wa-bg">
                                            <Text className="text-white text-[10px]">✓</Text>
                                        </View>
                                    )}
                                </View>
                                <View>
                                    <Text className="text-wa-text text-lg font-medium">
                                        {item.display_name || item.phone_number}
                                    </Text>
                                    <Text className="text-wa-muted text-sm">
                                        {item.status_text || 'Hey there! I am using WhatsApp.'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="p-10 items-center">
                            <Text className="text-wa-muted text-center">
                                {query.length > 0 ? 'No users found.' : 'Search for participants'}
                            </Text>
                        </View>
                    }
                />
            )}

            {selectedUsers.length > 0 && (
                <TouchableOpacity
                    className="absolute bottom-8 right-8 bg-wa-green w-16 h-16 rounded-full items-center justify-center shadow-lg"
                    onPress={handleNext}
                >
                    <Text className="text-white text-2xl font-bold">→</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
