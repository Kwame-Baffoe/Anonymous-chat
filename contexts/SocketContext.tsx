// contexts/SocketContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextProps {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.io client
    const socketIo = io(process.env.NEXT_PUBLIC_SOCKET_IO_URL as string, {
      path: '/api/socket',
    });

    setSocket(socketIo);

    // Cleanup on unmount
    return () => {
      socketIo.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
