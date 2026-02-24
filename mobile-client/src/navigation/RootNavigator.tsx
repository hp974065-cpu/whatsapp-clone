import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import ConversationScreen from '../screens/main/ConversationScreen';
import NewChatScreen from '../screens/main/NewChatScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CreateGroupScreen from '../screens/main/CreateGroupScreen';
import GroupFinalizeScreen from '../screens/main/GroupFinalizeScreen';
import GroupInfoScreen from '../screens/main/GroupInfoScreen';
import MainTabNavigator from './MainTabNavigator';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { accessToken, isLoading, loadAuth } = useAuthStore();

    useEffect(() => {
        loadAuth();
    }, []);

    if (isLoading) {
        return (
            <View className="flex-1 bg-wa-bg justify-center items-center">
                <ActivityIndicator size="large" color="#00a884" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {accessToken ? (
                    <Stack.Group>
                        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                        <Stack.Screen
                            name="Conversation"
                            component={ConversationScreen}
                            options={{
                                headerShown: true,
                                headerStyle: { backgroundColor: '#2a3942' },
                                headerTintColor: '#e9edef',
                                title: 'Chat'
                            }}
                        />
                        <Stack.Screen
                            name="NewChat"
                            component={NewChatScreen}
                            options={{
                                headerShown: true,
                                headerStyle: { backgroundColor: '#2a3942' },
                                headerTintColor: '#e9edef',
                                title: 'New chat'
                            }}
                        />
                        <Stack.Screen
                            name="Profile"
                            component={ProfileScreen}
                            options={{
                                headerShown: true,
                                headerStyle: { backgroundColor: '#2a3942' },
                                headerTintColor: '#e9edef',
                                title: 'Profile'
                            }}
                        />
                        <Stack.Screen
                            name="CreateGroup"
                            component={CreateGroupScreen}
                            options={{
                                headerShown: true,
                                headerStyle: { backgroundColor: '#2a3942' },
                                headerTintColor: '#e9edef',
                                title: 'New group'
                            }}
                        />
                        <Stack.Screen
                            name="GroupFinalize"
                            component={GroupFinalizeScreen}
                            options={{
                                headerShown: true,
                                headerStyle: { backgroundColor: '#2a3942' },
                                headerTintColor: '#e9edef',
                                title: 'New group'
                            }}
                        />
                        <Stack.Screen
                            name="GroupInfo"
                            component={GroupInfoScreen}
                            options={{
                                headerShown: true,
                                headerStyle: { backgroundColor: '#2a3942' },
                                headerTintColor: '#e9edef',
                                title: 'Group info'
                            }}
                        />
                    </Stack.Group>
                ) : (
                    <Stack.Group>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="OTP" component={OTPScreen} />
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
