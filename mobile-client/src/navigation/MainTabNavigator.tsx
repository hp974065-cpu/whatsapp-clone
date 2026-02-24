import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ChatListScreen from '../screens/main/ChatListScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

const Placeholder = ({ name }: { name: string }) => (
    <View className="flex-1 bg-wa-bg justify-center items-center">
        <Text className="text-wa-text">{name} Screen</Text>
    </View>
);

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#2a3942' },
                headerTintColor: '#e9edef',
                tabBarStyle: { backgroundColor: '#202c33', borderTopColor: '#2a3942' },
                tabBarActiveTintColor: '#00a884',
                tabBarInactiveTintColor: '#8696a0',
            }}
        >
            <Tab.Screen
                name="Chats"
                component={ChatListScreen}
                options={{ tabBarIcon: () => <Text>💬</Text> }}
            />
            <Tab.Screen
                name="Status"
                component={() => <Placeholder name="Status" />}
                options={{ tabBarIcon: () => <Text>📡</Text> }}
            />
            <Tab.Screen
                name="Calls"
                component={() => <Placeholder name="Calls" />}
                options={{ tabBarIcon: () => <Text>📞</Text> }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarIcon: () => <Text>⚙️</Text> }}
            />
        </Tab.Navigator>
    );
}
