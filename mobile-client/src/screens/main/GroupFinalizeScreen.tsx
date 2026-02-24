import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { groupApi } from '../../api/group';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';

export default function GroupFinalizeScreen({ route, navigation }: any) {
    const { members } = route.params;
    const [groupName, setGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleCreate = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        setCreating(true);
        try {
            const memberIds = members.map((m: any) => m.id);
            const group = await groupApi.createGroup(groupName, memberIds);

            // If we have an avatar, update the group
            if (avatarUrl) {
                await groupApi.updateGroup(group.id, { groupAvatar: avatarUrl });
            }

            Alert.alert('Success', 'Group created successfully');
            // Navigate to the new group conversation
            navigation.navigate('Conversation', {
                conversationId: group.id,
                otherUser: {
                    display_name: groupName,
                    avatar_url: avatarUrl
                }
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to create group');
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadAvatar(result.assets[0]);
        }
    };

    const uploadAvatar = async (asset: any) => {
        setUploading(true);
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', {
            uri: asset.uri,
            name: asset.fileName || 'group-avatar.jpg',
            type: asset.mimeType || 'image/jpeg',
        });

        try {
            const res = await client.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.mediaUrl) {
                setAvatarUrl(res.data.mediaUrl);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to upload avatar');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-wa-bg p-4">
            <View className="items-center my-8">
                <TouchableOpacity onPress={pickImage} disabled={uploading}>
                    <View className="w-24 h-24 bg-wa-header rounded-full items-center justify-center relative overflow-hidden">
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} className="w-24 h-24" />
                        ) : (
                            <Text className="text-white text-3xl">👥</Text>
                        )}
                        {uploading && (
                            <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                <ActivityIndicator color="#00a884" />
                            </View>
                        )}
                        <View className="absolute bottom-0 right-0 bg-wa-green p-1.5 rounded-full">
                            <Text className="text-white text-xs">📷</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <Text className="text-wa-muted text-sm mt-3">Add group icon (optional)</Text>
            </View>

            <View className="bg-wa-header rounded-xl p-4 mb-8">
                <Text className="text-wa-green text-xs font-semibold uppercase mb-2">Group Name</Text>
                <TextInput
                    className="text-wa-text text-lg border-b border-wa-bg pb-2"
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="Enter group name"
                    placeholderTextColor="#8696a0"
                    maxLength={25}
                />
                <Text className="text-wa-muted text-xs mt-2 text-right">
                    {groupName.length}/25
                </Text>
            </View>

            <View className="mb-8">
                <Text className="text-wa-muted text-sm font-semibold mb-3 uppercase">
                    Participants: {members.length}
                </Text>
                <View className="flex-row flex-wrap">
                    {members.map((user: any) => (
                        <View key={user.id} className="items-center mr-4 mb-4">
                            <View className="w-12 h-12 bg-wa-header rounded-full items-center justify-center mb-1">
                                <Text className="text-wa-text text-xs">{(user.display_name || '?')[0]}</Text>
                            </View>
                            <Text className="text-wa-muted text-[10px]" numberOfLines={1}>
                                {user.display_name?.split(' ')[0]}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            <TouchableOpacity
                className={`bg-wa-green p-4 rounded-xl items-center ${creating ? 'opacity-70' : ''}`}
                onPress={handleCreate}
                disabled={creating}
            >
                {creating ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold text-lg">Create Group</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
