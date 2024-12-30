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
    if (!session?.user) {
      setError(new Error('No user session available'));
      return;
    }

    // Clear any previous error state
    setError(null);

    try {
      const newSocket = io(window.location.origin, {
        path: '/api/socket',
        transports: ['polling', 'websocket'], // Try polling first
        auth: {
          token: session.user.id,
        },
        autoConnect: true,
        reconnection: true,
        timeout: 60000, // Match server timeout
        reconnectionAttempts: 5, // Increase retry attempts
        reconnectionDelay: 5000, // Start with longer delay
        reconnectionDelayMax: 30000, // Allow for longer max delay
        forceNew: true,
        upgrade: true,
        rememberUpgrade: true,
        transportOptions: {
          polling: {
            extraHeaders: {
              'Authorization': `Bearer ${session.user.id}`
            }
          }
        }
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
          Logger.warn('Socket disconnected - automatic reconnection will be attempted');
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
          newSocket.removeAllListeners();
          newSocket.close();
        }
      };
    } catch (err) {
      setError(err as Error);
      Logger.error('Socket initialization error:', err);
    }
  }, [session?.user]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

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
