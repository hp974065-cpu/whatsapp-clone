import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../api/config';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const { accessToken } = useAuthStore();

    useEffect(() => {
        if (accessToken) {
            const socket = io(WS_URL, {
                auth: { token: accessToken },
                transports: ['websocket'],
            });

            socket.on('connect', () => {
                console.log('[Socket] Connected:', socket.id);
            });

            socket.on('connect_error', (error) => {
                console.error('[Socket] Connection error:', error.message);
            });

            socketRef.current = socket;

            return () => {
                socket.disconnect();
                socketRef.current = null;
            };
        }
    }, [accessToken]);

    return socketRef.current;
};
