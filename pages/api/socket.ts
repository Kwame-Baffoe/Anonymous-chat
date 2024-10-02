// pages/api/socket.ts

import type { NextApiRequest } from 'next';
import { NextApiResponseWithSocket } from '../../types/NextApiResponseWithSocket';
import { Server as SocketIOServer, Socket } from 'socket.io';
import clientPromise from '../../lib/mongodb';

interface SocketData {
  roomId: string;
  senderId: string;
  message: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io');

    // Initialize Socket.io server
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
    });

    // Listen for client connections
    io.on('connection', (socket: Socket) => {
      console.log('A user connected:', socket.id);

      // Handle joining a room
      socket.on('joinRoom', (roomId: string) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
      });

      // Handle sending messages
      socket.on('sendMessage', async (data: SocketData) => {
        const { roomId, senderId, message, timestamp } = data;

        // Broadcast the message to the room
        io.to(roomId).emit('receiveMessage', { senderId, message, timestamp });

        // Store the message in MongoDB
        try {
          const client = await clientPromise;
          const db = client.db('anonymous-chat');
          const messagesCollection = db.collection('messages');

          await messagesCollection.insertOne({
            roomId,
            senderId,
            message,
            timestamp: new Date(timestamp),
          });
        } catch (error) {
          console.error('Error storing message:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
      });
    });

    // Attach the Socket.io server instance to the Next.js server
    res.socket.server.io = io;
  } else {
    console.log('Socket.io is already running');
  }

  // Respond to the API request
  res.status(200).end();
}