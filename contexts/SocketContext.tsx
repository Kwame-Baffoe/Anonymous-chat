// contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface SocketContextProps {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextProps>({ socket: null });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    // Initialize socket connection when session is available and socket is not already connected
    if (session?.accessToken && !socket) {
      const socketIo = io(process.env.NEXT_PUBLIC_SOCKET_IO_URL || '/', {
        path: '/api/socket',
        auth: {
          token: session.accessToken, // Pass the accessToken for authentication
        },
        transports: ['websocket'],
      });

      setSocket(socketIo);

      // Handle connection events
      socketIo.on('connect', () => {
        console.log('Connected to Socket.IO server');
      });

      socketIo.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      // Cleanup on unmount
      return () => {
        socketIo.disconnect();
      };
    }
  }, [session, socket]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);