import React from 'react';
import { View, Text, Image } from 'react-native';
import { MEDIA_URL } from '../api/config';

interface Props {
    message: {
        id: string;
        sender_id: string;
        text_content: string;
        content_type: string;
        media_url?: string;
        created_at: string;
        status: string;
    };
    isMine: boolean;
}

export default function MessageBubble({ message, isMine }: Props) {
    const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isImage = message.content_type === 'image';

    return (
        <View className={`mb-2 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
            <View
                className={`max-w-[85%] rounded-2xl ${isMine
                        ? 'bg-wa-sender rounded-tr-none'
                        : 'bg-wa-receiver rounded-tl-none'
                    } ${isImage ? 'p-1' : 'px-4 py-2'}`}
            >
                {isImage && (
                    <Image
                        source={{ uri: `${MEDIA_URL}/${message.media_url?.split('/').pop()}` }}
                        className="w-64 h-64 rounded-xl mb-1"
                        resizeMode="cover"
                    />
                )}

                {(!isImage || message.text_content) && (
                    <Text className="text-wa-text text-[16px] mb-1">
                        {message.text_content}
                    </Text>
                )}

                <View className="flex-row justify-end items-center px-2">
                    <Text className="text-wa-muted text-[10px] mr-1">
                        {time}
                    </Text>
                    {isMine && (
                        <Text className={`text-[10px] ${message.status === 'read' ? 'text-blue-400' : 'text-wa-muted'}`}>
                            {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}
