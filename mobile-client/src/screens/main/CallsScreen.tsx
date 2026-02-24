import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

export default function CallsScreen() {
    const mockCalls = [
        { id: '1', name: 'John Doe', time: 'Yesterday, 10:24 PM', type: 'incoming', missed: true },
        { id: '2', name: 'Jane Smith', time: 'February 22, 5:12 PM', type: 'outgoing', missed: false },
        { id: '3', name: 'Group Chat', time: 'February 21, 11:00 AM', type: 'incoming', missed: false },
    ];

    return (
        <ScrollView className="flex-1 bg-wa-bg">
            {mockCalls.map(call => (
                <TouchableOpacity key={call.id} className="flex-row items-center p-4 border-b border-wa-header">
                    <View className="w-12 h-12 bg-wa-header rounded-full items-center justify-center mr-4">
                        <Text className="text-wa-text font-bold">{call.name[0]}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className={`text-lg font-medium ${call.missed ? 'text-red-400' : 'text-wa-text'}`}>
                            {call.name}
                        </Text>
                        <View className="flex-row items-center">
                            <Text className="text-wa-muted text-xs">
                                {call.type === 'incoming' ? '↙️' : '↗️'} {call.time}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity className="p-2">
                        <Text className="text-wa-green text-xl">📞</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            ))}

            <View className="p-10 items-center">
                <Text className="text-wa-muted text-xs text-center">To start a call with a contact who has WhatsApp, tap the call icon at the bottom of your screen.</Text>
            </View>
        </ScrollView>
    );
}
