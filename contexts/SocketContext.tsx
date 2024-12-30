// contexts/SocketContext.tsx
import React, { createContext } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../hooks/useSocket';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
  error: null,
  reconnect: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketState = useSocket();

  return <SocketContext.Provider value={socketState}>{children}</SocketContext.Provider>;
};

export { SocketContext };
