// hooks/useSocket.ts

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

const useSocket = () => {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      // Initialize Socket.IO client
      socketRef.current = io({
        path: '/api/socket',
        auth: {
          token: session.accessToken, // Pass the accessToken for authentication
        },
        transports: ['websocket'], // Use WebSocket transport
        reconnectionAttempts: 5, // Number of reconnection attempts
        reconnectionDelay: 1000, // Initial delay before reconnection
      });

      // Connection successful
      socketRef.current.on('connect', () => {
        console.log('Connected to Socket.IO server');
      });

      // Handle connection errors
      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      // Handle other events as needed
      // Example: Listening for new messages
      socketRef.current.on('newMessage', (message) => {
        console.log('Received new message:', message);
        // Update your state or UI accordingly
      });

      // Clean up on unmount
      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [session]);

  return socketRef.current;
};

export default useSocket;
