import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../api/user';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';

export default function ProfileScreen({ navigation }: any) {
    const { user, setUser } = useAuthStore();
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [statusText, setStatusText] = useState(user?.status_text || '');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        if (!displayName.trim()) {
            Alert.alert('Error', 'Display name cannot be empty');
            return;
        }

        setSaving(true);
        try {
            const updatedUser = await userApi.updateProfile({
                display_name: displayName,
                status_text: statusText,
            });
            setUser(updatedUser);
            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
            console.error(error);
        } finally {
            setSaving(false);
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
            name: asset.fileName || 'avatar.jpg',
            type: asset.mimeType || 'image/jpeg',
        });

        try {
            const res = await client.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.mediaUrl) {
                const updatedUser = await userApi.updateProfile({
                    avatar_url: res.data.mediaUrl,
                });
                setUser(updatedUser);
                Alert.alert('Success', 'Avatar updated successfully');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to upload avatar');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const initial = (user?.display_name || user?.phone_number || '?')[0].toUpperCase();

    return (
        <ScrollView className="flex-1 bg-wa-bg p-4">
            {/* Avatar Section */}
            <View className="items-center my-8">
                <TouchableOpacity onPress={pickImage} disabled={uploading}>
                    <View className="w-32 h-32 bg-wa-header rounded-full items-center justify-center relative overflow-hidden">
                        {user?.avatar_url ? (
                            <Image
                                source={{ uri: user.avatar_url }}
                                className="w-32 h-32"
                            />
                        ) : (
                            <Text className="text-wa-text text-5xl font-bold">{initial}</Text>
                        )}
                        {uploading && (
                            <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                <ActivityIndicator color="#00a884" />
                            </View>
                        )}
                        <View className="absolute bottom-0 right-0 bg-wa-green p-2 rounded-full">
                            <Text className="text-white">📷</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <Text className="text-wa-muted text-sm mt-4">Tap icon to change profile photo</Text>
            </View>

            {/* Inputs Section */}
            <View className="bg-wa-header rounded-xl p-4 mb-6">
                <Text className="text-wa-green text-xs font-semibold uppercase mb-2">Your Name</Text>
                <TextInput
                    className="text-wa-text text-lg border-b border-wa-bg pb-2"
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                    placeholderTextColor="#8696a0"
                />
                <Text className="text-wa-muted text-xs mt-2">
                    This is not your username or pin. This name will be visible to your contacts.
                </Text>
            </View>

            <View className="bg-wa-header rounded-xl p-4 mb-8">
                <Text className="text-wa-green text-xs font-semibold uppercase mb-2">About</Text>
                <TextInput
                    className="text-wa-text text-lg border-b border-wa-bg pb-2"
                    value={statusText}
                    onChangeText={setStatusText}
                    placeholder="Hey there! I am using WhatsApp."
                    placeholderTextColor="#8696a0"
                />
            </View>

            <TouchableOpacity
                className={`bg-wa-green p-4 rounded-xl items-center ${saving ? 'opacity-70' : ''}`}
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold text-lg">Save Changes</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
