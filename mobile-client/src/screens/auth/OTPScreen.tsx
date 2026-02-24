import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function OTPScreen({ route }: any) {
    const { phoneNumber } = route.params;
    const [otp, setOtp] = useState('123456');
    const [loading, setLoading] = useState(false);
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const res = await client.post('/auth/verify-otp', {
                phoneNumber,
                otp,
                deviceId: 'android-client-dev',
            });

            if (res.data.success) {
                const { accessToken, refreshToken, user } = res.data;
                await setAuth(accessToken, refreshToken, user);
            } else {
                Alert.alert('Error', res.data.message || 'Invalid OTP');
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-wa-bg p-8 justify-center">
            <View className="items-center mb-10">
                <Text className="text-wa-text text-2xl font-bold mb-2">Verify Number</Text>
                <Text className="text-wa-muted text-center">
                    Code sent to <Text className="text-wa-text font-bold">{phoneNumber}</Text>
                </Text>
                <View className="bg-wa-green/10 p-3 rounded-lg mt-4 border border-wa-green/30">
                    <Text className="text-wa-green text-sm">🔑 Dev Mode: OTP is 123456</Text>
                </View>
            </View>

            <View className="bg-wa-panel p-6 rounded-2xl border border-wa-header">
                <Text className="text-wa-muted text-xs mb-2">6-Digit Code</Text>
                <TextInput
                    className="bg-wa-input p-4 rounded-xl text-wa-text text-2xl text-center font-bold border border-wa-header focus:border-wa-green"
                    placeholder="000000"
                    placeholderTextColor="#8696a0"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                />

                <TouchableOpacity
                    className="bg-wa-green p-4 rounded-xl mt-6 items-center flex-row justify-center"
                    onPress={handleVerifyOtp}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Verify & Login</Text>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity className="mt-6 self-center">
                <Text className="text-wa-green font-medium">Resend Code</Text>
            </TouchableOpacity>
        </View>
    );
}
