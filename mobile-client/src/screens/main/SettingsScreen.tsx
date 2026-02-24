import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen() {
    const { user, clearAuth } = useAuthStore();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => clearAuth()
                },
            ]
        );
    };

    const initial = (user?.display_name || user?.phone_number || '?')[0].toUpperCase();

    return (
        <ScrollView className="flex-1 bg-wa-bg">
            {/* Profile Header */}
            <TouchableOpacity className="flex-row items-center p-4 bg-wa-header mb-6">
                <View className="w-16 h-16 bg-wa-hover rounded-full items-center justify-center mr-4">
                    {user?.avatar_url ? (
                        <Image
                            source={{ uri: user.avatar_url }}
                            className="w-16 h-16 rounded-full"
                        />
                    ) : (
                        <Text className="text-wa-text text-2xl font-bold">{initial}</Text>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-wa-text text-xl font-semibold">
                        {user?.display_name || 'Set Name'}
                    </Text>
                    <Text className="text-wa-muted text-sm">
                        {user?.status_text || 'Hey there! I am using WhatsApp.'}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Settings Options */}
            <View className="px-4">
                <SettingItem
                    icon="🔑"
                    title="Account"
                    subtitle="Security notifications, change number"
                />
                <SettingItem
                    icon="🔒"
                    title="Privacy"
                    subtitle="Block contacts, disappearing messages"
                />
                <SettingItem
                    icon="💬"
                    title="Chats"
                    subtitle="Theme, wallpapers, chat history"
                />
                <SettingItem
                    icon="🔔"
                    title="Notifications"
                    subtitle="Message, group & call tones"
                />
                <SettingItem
                    icon="💾"
                    title="Storage and Data"
                    subtitle="Network usage, auto-download"
                />

                <TouchableOpacity
                    className="flex-row items-center py-4 border-b border-wa-header"
                    onPress={handleLogout}
                >
                    <Text className="text-2xl mr-4">🚪</Text>
                    <View>
                        <Text className="text-red-400 text-lg font-medium">Logout</Text>
                        <Text className="text-wa-muted text-sm">Clear session and exit</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View className="p-8 items-center">
                <Text className="text-wa-muted text-xs uppercase tracking-widest mb-1">from</Text>
                <Text className="text-wa-text font-bold tracking-widest">METAVERSE</Text>
            </View>
        </ScrollView>
    );
}

function SettingItem({ icon, title, subtitle }: { icon: string, title: string, subtitle: string }) {
    return (
        <TouchableOpacity className="flex-row items-center py-4 border-b border-wa-header">
            <Text className="text-2xl mr-4">{icon}</Text>
            <View className="flex-1">
                <Text className="text-wa-text text-lg font-medium">{title}</Text>
                <Text className="text-wa-muted text-sm">{subtitle}</Text>
            </View>
        </TouchableOpacity>
    );
}
