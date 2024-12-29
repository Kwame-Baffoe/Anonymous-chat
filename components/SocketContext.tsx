import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

export type SocketContextProps = {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
  reconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 2000;

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);

  const initializeSocket = useCallback(() => {
    try {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
        path: '/api/socketio',
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        reconnectionDelay: RECONNECTION_DELAY,
        timeout: 10000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        setError(null);
        setReconnectionAttempts(0);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError(err);
        setIsConnected(false);
        
        if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
          setReconnectionAttempts(prev => prev + 1);
          setTimeout(() => {
            console.log(`Attempting reconnection ${reconnectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS}`);
            newSocket.connect();
          }, RECONNECTION_DELAY);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, attempt reconnection
          setTimeout(() => {
            newSocket.connect();
          }, RECONNECTION_DELAY);
        }
      });

      setSocket(newSocket);

      return newSocket;
    } catch (err) {
      console.error('Socket initialization error:', err);
      setError(err as Error);
      return null;
    }
  }, [reconnectionAttempts]);

  useEffect(() => {
    const newSocket = initializeSocket();

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [initializeSocket]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    setReconnectionAttempts(0);
    initializeSocket();
  }, [socket, initializeSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
