import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ChatListScreen from '../screens/main/ChatListScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import StatusScreen from '../screens/main/StatusScreen';
import CallsScreen from '../screens/main/CallsScreen';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();

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
                component={StatusScreen}
                options={{ tabBarIcon: () => <Text>📡</Text> }}
            />
            <Tab.Screen
                name="Calls"
                component={CallsScreen}
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
