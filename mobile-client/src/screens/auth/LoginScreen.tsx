import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import client from '../../api/client';

export default function LoginScreen({ navigation }: any) {
    const [phoneNumber, setPhoneNumber] = useState('+911111111111');
    const [loading, setLoading] = useState(false);

    const handleRequestOtp = async () => {
        if (!phoneNumber || !phoneNumber.startsWith('+')) {
            Alert.alert('Invalid Phone', 'Please enter a phone number in E.164 format (e.g., +91XXXXXXXXXX)');
            return;
        }

        setLoading(true);
        try {
            const res = await client.post('/auth/request-otp', { phoneNumber });
            if (res.data.success) {
                navigation.navigate('OTP', { phoneNumber });
            } else {
                Alert.alert('Error', res.data.message || 'Failed to send OTP');
            }
        } catch (error: any) {
            console.error('Request OTP error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to connect to server. Ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-wa-bg p-8 justify-center">
            <View className="items-center mb-10">
                <View className="w-20 h-20 bg-wa-green rounded-full items-center justify-center mb-4">
                    <Text className="text-4xl">💬</Text>
                </View>
                <Text className="text-wa-text text-2xl font-bold">WhatsApp Clone</Text>
                <Text className="text-wa-muted text-center mt-2">
                    Verify your phone number to get started
                </Text>
            </View>

            <View className="bg-wa-panel p-6 rounded-2xl border border-wa-header">
                <Text className="text-wa-muted text-xs mb-2">Phone Number</Text>
                <TextInput
                    className="bg-wa-input p-4 rounded-xl text-wa-text text-lg border border-wa-header focus:border-wa-green"
                    placeholder="+91XXXXXXXXXX"
                    placeholderTextColor="#8696a0"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                />

                <TouchableOpacity
                    className="bg-wa-green p-4 rounded-xl mt-6 items-center flex-row justify-center"
                    onPress={handleRequestOtp}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Next</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text className="text-wa-muted text-center text-xs mt-8">
                Carrier charges may apply
            </Text>
        </View>
    );
}
