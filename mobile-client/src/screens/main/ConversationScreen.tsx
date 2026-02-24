import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { chatApi } from '../../api/chat';
import MessageBubble from '../../components/MessageBubble';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import client from '../../api/client';

export default function ConversationScreen({ route, navigation }: any) {
    const { conversationId, otherUser } = route.params;
    const { user: currentUser } = useAuthStore();
    const [text, setText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [presence, setPresence] = useState<any>(null);
    const queryClient = useQueryClient();
    const socket = useSocket();
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<any>(null);

    const { data: messages, isLoading } = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => conversationId ? chatApi.getMessages(conversationId) : Promise.resolve([]),
        enabled: !!conversationId,
    });

    // Handle header and presence
    useEffect(() => {
        let statusText = presence?.status === 'online' ? 'online' : '';
        if (isOtherTyping) statusText = 'typing...';

        navigation.setOptions({
            headerTitle: () => (
                <TouchableOpacity
                    onPress={() => {
                        // Only navigate if we have a conversationId (group)
                        if (conversationId) {
                            navigation.navigate('GroupInfo', {
                                groupId: conversationId,
                                groupName: otherUser?.display_name || 'Group',
                                avatarUrl: otherUser?.avatar_url
                            });
                        }
                    }}
                >
                    <Text className="text-wa-text font-bold text-lg">{otherUser?.display_name || 'Chat'}</Text>
                    {statusText ? (
                        <Text className="text-wa-green text-xs font-medium">{statusText}</Text>
                    ) : null}
                </TouchableOpacity>
            )
        });
    }, [otherUser, presence, isOtherTyping, conversationId]);

    useEffect(() => {
        if (!socket) return;
        if (conversationId) socket.emit('conversation:join', { conversationId });

        const handleNewMessage = (msg: any) => {
            if (msg.conversationId === conversationId) {
                queryClient.setQueryData(['messages', conversationId], (old: any) => [msg, ...(old || [])]);
                if (msg.senderId !== currentUser?.id) {
                    socket.emit('message:delivered', { messageId: msg.id });
                }
            }
        };

        const handlePresence = (data: any) => {
            if (data.userId === otherUser?.id) {
                setPresence(data);
            }
        };

        const handleTyping = (data: any) => {
            if (data.conversationId === conversationId && data.userId === otherUser?.id) {
                setIsOtherTyping(data.isTyping);
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('user:presence', handlePresence);
        socket.on('typing:update', handleTyping);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('user:presence', handlePresence);
            socket.off('typing:update', handleTyping);
        };
    }, [socket, conversationId, otherUser]);

    const handleSend = () => {
        if (!text.trim() || !socket) return;
        sendMessage({ contentType: 'text', textContent: text });
        setText('');
    };

    const handleTextChange = (val: string) => {
        setText(val);
        if (!socket || !conversationId) return;

        // Emit typing start
        socket.emit('typing:start', { conversationId });

        // Stop typing after 2 seconds of inactivity
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId });
        }, 2000);
    };

    const sendMessage = (params: any) => {
        const tempId = `temp-${Date.now()}`;
        const newMsg = {
            id: tempId,
            sender_id: currentUser?.id || '',
            conversation_id: conversationId,
            text_content: params.textContent || '',
            content_type: params.contentType,
            media_url: params.mediaUrl,
            created_at: new Date().toISOString(),
            status: 'pending',
        };

        queryClient.setQueryData(['messages', conversationId], (old: any) => [newMsg, ...(old || [])]);

        if (!socket) {
            console.warn('[Chat] Socket not connected, message might be delayed');
        }

        socket?.emit('message:send', {
            conversationId,
            clientMessageId: tempId,
            ...params
        }, (ack: any) => {
            if (ack?.success) {
                queryClient.setQueryData(['messages', conversationId], (old: any) =>
                    old.map((m: any) => m.id === tempId ? { ...m, ...ack.message, status: 'sent' } : m)
                );
            }
        });
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadMedia(result.assets[0]);
        }
    };

    const uploadMedia = async (asset: any) => {
        setUploading(true);
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', {
            uri: asset.uri,
            name: asset.fileName || 'upload.jpg',
            type: asset.mimeType || 'image/jpeg',
        });

        try {
            const res = await client.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.mediaUrl) {
                sendMessage({
                    contentType: res.data.contentType,
                    mediaUrl: res.data.mediaUrl,
                    mediaThumbnail: res.data.mediaThumbnail,
                    mediaSize: res.data.mediaSize,
                    textContent: asset.fileName || 'image.jpg',
                });
            }
        } catch (error) {
            Alert.alert('Upload Failed', 'Could not upload media');
            console.error('Media upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-wa-bg justify-center items-center">
                <ActivityIndicator size="large" color="#00a884" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-wa-chat"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <FlatList
                ref={flatListRef}
                data={messages || []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MessageBubble message={item} isMine={item.sender_id === currentUser?.id} />
                )}
                contentContainerStyle={{ padding: 16 }}
                inverted={true}
            />

            <View className="p-2 bg-wa-panel flex-row items-center border-t border-wa-header">
                <TouchableOpacity className="p-2" onPress={pickImage} disabled={uploading}>
                    {uploading ? <ActivityIndicator size="small" color="#8696a0" /> : <Text className="text-wa-muted text-xl">📎</Text>}
                </TouchableOpacity>

                <TextInput
                    className="flex-1 bg-wa-input text-wa-text px-4 py-2 rounded-full mx-2 max-h-24"
                    placeholder="Type a message"
                    placeholderTextColor="#8696a0"
                    value={text}
                    onChangeText={handleTextChange}
                    multiline
                />

                <TouchableOpacity
                    className="bg-wa-green w-10 h-10 rounded-full items-center justify-center"
                    disabled={!text.trim() || !socket || uploading}
                    onPress={handleSend}
                >
                    <Text className="text-white">🚀</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
