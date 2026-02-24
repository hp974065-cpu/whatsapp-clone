import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { groupApi, GroupMember } from '../../api/group';
import { useAuthStore } from '../../store/authStore';

export default function GroupInfoScreen({ route, navigation }: any) {
    const { groupId, groupName, avatarUrl } = route.params;
    const { user: currentUser } = useAuthStore();

    const { data: members, isLoading } = useQuery({
        queryKey: ['groupMembers', groupId],
        queryFn: () => groupApi.getMembers(groupId),
    });

    const handleRemoveMember = (member: GroupMember) => {
        if (member.id === currentUser?.id) return;

        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.display_name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await groupApi.removeMember(groupId, member.id);
                            // Refresh members list? React Query will handle it if we invalidate
                            // For simplicity, we can let user know or use optimistic updates
                            Alert.alert('Success', 'Member removed');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to remove member');
                        }
                    }
                }
            ]
        );
    };

    const renderMember = ({ item }: { item: GroupMember }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b border-wa-header"
            onLongPress={() => handleRemoveMember(item)}
            disabled={item.id === currentUser?.id}
        >
            <View className="w-10 h-10 bg-wa-header rounded-full items-center justify-center mr-4">
                {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} className="w-10 h-10 rounded-full" />
                ) : (
                    <Text className="text-wa-text font-bold">{(item.display_name || '?')[0]}</Text>
                )}
            </View>
            <View className="flex-1">
                <Text className="text-wa-text text-base font-medium">
                    {item.id === currentUser?.id ? 'You' : item.display_name || item.phone_number}
                </Text>
                <Text className="text-wa-muted text-xs">{item.status_text || 'Available'}</Text>
            </View>
            {item.role === 'admin' && (
                <View className="border border-wa-green rounded px-1">
                    <Text className="text-wa-green text-[10px]">Group Admin</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 bg-wa-bg">
            {/* Header info */}
            <View className="items-center bg-wa-header py-8 pb-4">
                <View className="w-32 h-32 bg-wa-bg rounded-full items-center justify-center mb-4">
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} className="w-32 h-32 rounded-full" />
                    ) : (
                        <Text className="text-white text-5xl">👥</Text>
                    )}
                </View>
                <Text className="text-wa-text text-2xl font-bold">{groupName}</Text>
                <Text className="text-wa-muted mt-1">Group • {members?.length || 0} participants</Text>
            </View>

            {/* Members Section */}
            <View className="mt-4 bg-wa-header">
                <View className="p-4 border-b border-wa-bg">
                    <Text className="text-wa-green font-semibold uppercase text-xs">
                        {members?.length || 0} participants
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator color="#00a884" className="my-8" />
                ) : (
                    <FlatList
                        data={members}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMember}
                        scrollEnabled={false}
                        ListHeaderComponent={
                            <TouchableOpacity className="flex-row items-center p-4">
                                <View className="w-10 h-10 bg-wa-green rounded-full items-center justify-center mr-4">
                                    <Text className="text-white text-xl">+</Text>
                                </View>
                                <Text className="text-wa-text text-base font-medium">Add members</Text>
                            </TouchableOpacity>
                        }
                    />
                )}
            </View>

            <TouchableOpacity
                className="mt-4 bg-wa-header p-4 flex-row items-center"
                onPress={() => Alert.alert('Exit Group', 'Feature coming soon')}
            >
                <Text className="text-red-500 text-lg mr-4">🚪</Text>
                <Text className="text-red-500 text-lg">Exit group</Text>
            </TouchableOpacity>

            <View className="h-20" />
        </ScrollView>
    );
}
