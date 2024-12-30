import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { Logger } from '../utils/Logger';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { data: session } = useSession();

  const connect = useCallback(() => {
    if (!session?.accessToken) {
      setError(new Error('No access token available'));
      return;
    }

    // Clear any previous error state
    setError(null);

    try {
      // Default to window.location.origin if NEXT_PUBLIC_SOCKET_URL is not set
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      const newSocket = io(socketUrl, {
        path: '/api/socketio',
        transports: ['websocket', 'polling'], // Allow fallback to polling
        auth: {
          token: session.accessToken,
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10, // Increase retry attempts
        reconnectionDelay: 2000, // Increase delay between retries
        timeout: 10000, // Increase connection timeout
      });

      const setupSocketListeners = (socket: Socket) => {
        socket.on('connect', () => {
          setIsConnected(true);
          setError(null);
          Logger.info('Socket connected');
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
          Logger.warn('Socket disconnected');
          // Attempt to reconnect after disconnect
          setTimeout(() => {
            if (!socket.connected) {
              socket.connect();
            }
          }, 5000);
        });

        socket.on('connect_error', (err) => {
          setError(err);
          setIsConnected(false);
          Logger.error('Socket connection error:', err);
        });

        socket.on('reconnect_failed', () => {
          setError(new Error('Failed to reconnect after maximum attempts'));
          Logger.error('Socket reconnection failed');
        });
      };

      setupSocketListeners(newSocket);
      setSocket(newSocket);

      return () => {
        if (newSocket) {
          // Remove all listeners before closing
          newSocket.removeAllListeners();
          newSocket.close();
        }
      };
    } catch (err) {
      setError(err as Error);
      Logger.error('Socket initialization error:', err);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect, session?.accessToken]);

  const reconnect = useCallback(() => {
    Logger.info('Attempting to reconnect socket...');
    if (socket) {
      socket.removeAllListeners();
      socket.close();
      setSocket(null);
    }
    setIsConnected(false);
    connect();
  }, [socket, connect]);

  return {
    socket,
    isConnected,
    error,
    reconnect,
  };
};
