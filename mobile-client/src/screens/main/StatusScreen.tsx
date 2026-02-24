import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function StatusScreen() {
    const { user } = useAuthStore();
    const initial = (user?.display_name || '?')[0].toUpperCase();

    return (
        <ScrollView className="flex-1 bg-wa-bg">
            <TouchableOpacity className="flex-row items-center p-4">
                <View className="w-14 h-14 bg-wa-header rounded-full items-center justify-center mr-4 relative">
                    <View className="w-14 h-14 bg-wa-hover rounded-full items-center justify-center">
                        <Text className="text-wa-text text-xl">{(user?.display_name || '?')[0]}</Text>
                    </View>
                    <View className="absolute bottom-0 right-0 bg-wa-green w-5 h-5 rounded-full items-center justify-center border-2 border-wa-bg">
                        <Text className="text-white text-[10px]">+</Text>
                    </View>
                </View>
                <View>
                    <Text className="text-wa-text text-lg font-semibold">My status</Text>
                    <Text className="text-wa-muted text-sm">Tap to add status update</Text>
                </View>
            </TouchableOpacity>

            <View className="bg-wa-header px-4 py-2">
                <Text className="text-wa-muted text-xs uppercase font-bold tracking-widest">Recent updates</Text>
            </View>

            <View className="flex-1 items-center justify-center p-10 mt-10">
                <Text className="text-wa-muted text-center mb-4">No status updates yet.</Text>
                <Text className="text-wa-muted text-xs text-center">When your contacts share status updates, they will appear here.</Text>
            </View>
        </ScrollView>
    );
}
