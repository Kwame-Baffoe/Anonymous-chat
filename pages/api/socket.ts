import { Server as SocketIOServer } from 'socket.io';
import type { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '../../types/next';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../lib/mongodb';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface SocketData {
  roomId: string;
  content?: string;
  audioData?: string;
  timestamp: string;
}

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 10,
});

const SocketHandler = async (
  req: NextApiRequest,
  res: NextApiResponseServerIO
) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io');
    const io = new SocketIOServer(res.socket.server as any, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.use(async (socket, next) => {
      try {
        const token = await getToken({
          req: socket.request as any,
          secret: process.env.NEXTAUTH_SECRET,
        });
        if (
          token &&
          typeof token.sub === 'string' &&
          typeof token.name === 'string'
        ) {
          socket.data.userId = token.sub;
          socket.data.username = token.name;
          return next();
        }
        return next(new Error('Unauthorized: Invalid token'));
      } catch (error) {
        console.error('Authentication error:', error);
        return next(
          new Error(
            'Authentication failed: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          )
        );
      }
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      socket.on('joinRoom', async (roomId: string) => {
        if (typeof roomId !== 'string' || !ObjectId.isValid(roomId)) {
          return socket.emit('error', 'Invalid room ID');
        }

        try {
          const { db } = await connectToDatabase();
          const room = await db
            .collection('rooms')
            .findOne({ _id: new ObjectId(roomId) });

          if (!room) {
            return socket.emit('error', 'Room not found');
          }

          await socket.join(roomId);
          console.log(`Socket ${socket.id} joined room ${roomId}`);
          socket.to(roomId).emit('userJoined', {
            userId: socket.data.userId,
            username: socket.data.username,
          });
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', 'Failed to join room');
        }
      });

      socket.on('sendMessage', async (data: SocketData) => {
        try {
          await rateLimiter.consume(socket.data.userId);
        } catch {
          return socket.emit(
            'error',
            'Rate limit exceeded. Please wait before sending more messages.'
          );
        }

        const { roomId, content, audioData, timestamp } = data;
        const senderId = socket.data.userId;
        const username = socket.data.username;

        if (
          !roomId ||
          (!content && !audioData) ||
          !timestamp ||
          typeof roomId !== 'string' ||
          !ObjectId.isValid(roomId)
        ) {
          return socket.emit('error', 'Invalid message data');
        }

        try {
          const { db } = await connectToDatabase();
          const messagesCollection = db.collection('messages');

          let newMessage: any = {
            roomId: new ObjectId(roomId),
            userId: new ObjectId(senderId),
            username,
            reactions: {},
            createdAt: new Date(timestamp),
          };

          if (content) {
            newMessage.content = content;
          } else if (audioData) {
            const audioUrl = await saveAudioData(audioData);
            newMessage.audioUrl = audioUrl;
          }

          const result = await messagesCollection.insertOne(newMessage);
          const insertedMessage = { ...newMessage, _id: result.insertedId };

          await db.collection('rooms').updateOne(
            { _id: new ObjectId(roomId) },
            {
              $set: {
                lastMessage: content || 'Voice Message',
                lastMessageAt: new Date(timestamp),
                lastMessageUser: username,
              },
            }
          );

          io.to(roomId).emit('newMessage', insertedMessage);
          console.log('Message stored in database:', result.insertedId);
        } catch (error) {
          console.error('Error storing message:', error);
          socket.emit('error', 'Failed to store message');
        }
      });

      socket.on('reactMessage', async (data) => {
        const { messageId, emoji, userId } = data;
        if (!messageId || !emoji || !userId) {
          return socket.emit('error', 'Invalid reaction data');
        }

        try {
          const { db } = await connectToDatabase();
          const messagesCollection = db.collection('messages');

          const message = await messagesCollection.findOne({
            _id: new ObjectId(messageId),
          });

          if (!message) {
            return socket.emit('error', 'Message not found');
          }

          const reactions = message.reactions || {};
          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }

          if (!reactions[emoji].includes(userId)) {
            reactions[emoji].push(userId);
          } else {
            reactions[emoji] = reactions[emoji].filter((id) => id !== userId);
          }

          await messagesCollection.updateOne(
            { _id: new ObjectId(messageId) },
            { $set: { reactions } }
          );

          const updatedMessage = await messagesCollection.findOne({
            _id: new ObjectId(messageId),
          });

          io.to(message.roomId.toString()).emit('updateReactions', updatedMessage);
        } catch (error) {
          console.error('Error updating reactions:', error);
          socket.emit('error', 'Failed to update reactions');
        }
      });

      socket.on('leaveRoom', (roomId: string) => {
        if (typeof roomId !== 'string' || !ObjectId.isValid(roomId)) {
          return socket.emit('error', 'Invalid room ID');
        }
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit('userLeft', {
          userId: socket.data.userId,
          username: socket.data.username,
        });
      });

      socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

async function saveAudioData(audioData: string): Promise<string> {
  // Implement the logic to save audio data to storage and return the URL
  // For simplicity, we're returning a placeholder URL here
  return 'https://your-storage-service.com/audio/' + Date.now();
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default SocketHandler;
