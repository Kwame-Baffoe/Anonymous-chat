// pages/api/socket.ts

import { NextApiRequest } from 'next';
import { Server } from 'socket.io';
import { NextApiResponseServerIO } from '../../types/next';
import jwt from 'jsonwebtoken';
import { Message } from '../../interfaces/Message';
import { User } from '../../interfaces/User';
import { query } from '../../lib/postgresql';

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['polling', 'websocket'],
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Authorization']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      allowUpgrades: true,
      perMessageDeflate: true,
      httpCompression: true,
    });

    // Middleware for authentication
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (token) {
        try {
          // Get user from database using the user ID token
          const result = await query(
            'SELECT * FROM users WHERE id = $1',
            [token]
          );
          
          if (!result.rows[0]) {
            return next(new Error('User not found'));
          }
          
          const user = result.rows[0];
          socket.data.user = user;
          next();
        } catch (err) {
          console.error('Token verification error:', err);
          next(new Error('Authentication error'));
        }
      } else {
        next(new Error('No token provided'));
      }
    });

    io.on('connection', (socket) => {
      const user = socket.data.user;
      if (!user?.id || !user?.email) {
        console.error('Invalid user data:', user);
        socket.disconnect();
        return;
      }
      console.log(`User connected: ${user.email} (${socket.id})`);

      // Handle joining a room
      socket.on('joinRoom', (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${user.email} joined room ${roomId}`);
      });

      // Handle leaving a room
      socket.on('leaveRoom', (roomId: string) => {
        socket.leave(roomId);
        console.log(`User ${user.email} left room ${roomId}`);
      });

      // Handle sending a message
      socket.on('sendMessage', async (data: { roomId: string; content: string; attachments?: any[] }) => {
        const { roomId, content, attachments } = data;

        // Create message object
        const message: Message = {
          _id: generateUniqueId(), // Implement a function to generate unique IDs
          roomId,
          userId: user.id.toString(),
          username: user.username || user.email,
          content,
          createdAt: new Date().toISOString(),
          reactions: {},
          attachments,
        };

        try {
          // Save message to the database
          const savedMessage = await saveMessageToDatabase(message);
          if (savedMessage) {
            // Only emit the message if it was successfully saved
            io.in(roomId).emit('newMessage', {
              ...message,
              _id: savedMessage.id.toString() // Use the database-generated ID
            });
          }
        } catch (error) {
          console.error('Error saving message to database:', error);
          // Emit error back to sender
          socket.emit('messageSendError', {
            error: 'Failed to send message. Please try again.',
            originalMessage: message
          });
        }
      });

      // Handle user typing
      socket.on('userTyping', (data: { roomId: string }) => {
        const { roomId } = data;
        socket.to(roomId).emit('userTyping', {
          userId: user.id.toString(),
          username: user.username || user.email,
        });
      });

      // Handle user stopped typing
      socket.on('userStoppedTyping', (data: { roomId: string }) => {
        const { roomId } = data;
        socket.to(roomId).emit('userStoppedTyping', {
          userId: user.id.toString(),
          username: user.username || user.email,
        });
      });

      // Handle message reaction
      socket.on('messageReaction', (data: { messageId: string; emoji: string; roomId: string }) => {
        const { messageId, emoji, roomId } = data;

        // Update message reactions in the database (implement your own logic)
        try {
          updateMessageReactionInDatabase(messageId, emoji, user.id.toString());
        } catch (error) {
          console.error('Error updating message reaction:', error);
        }

        // Notify clients about the new reaction
        io.in(roomId).emit('messageReaction', {
          messageId,
          emoji,
          userId: user.id.toString(),
        });
      });

      // Handle editing a message
      socket.on('editMessage', async (data: { messageId: string; content: string; roomId: string }) => {
        const { messageId, content, roomId } = data;

        // Update message content in the database (implement your own logic)
        try {
          await editMessageInDatabase(messageId, content, user.id.toString());
        } catch (error) {
          console.error('Error editing message:', error);
          return;
        }

        // Notify clients about the edited message
        io.in(roomId).emit('messageEdited', {
          _id: messageId,
          content,
          isEdited: true,
        });
      });

      // Handle deleting a message
      socket.on('deleteMessage', async (data: { messageId: string; roomId: string }) => {
        const { messageId, roomId } = data;

        // Delete message from the database (implement your own logic)
        try {
          await deleteMessageFromDatabase(messageId, user.id.toString());
        } catch (error) {
          console.error('Error deleting message:', error);
          return;
        }

        // Notify clients about the deleted message
        io.in(roomId).emit('messageDeleted', messageId);
      });

      // Handle presence updates
      socket.on('updatePresence', (data: { presence: User['presence'] }) => {
        const { presence } = data;
        // Update user's presence in the database or in-memory store
        updateUserPresence(user.id.toString(), presence);

        // Notify other users about the presence change
        socket.broadcast.emit('userPresenceChanged', {
          userId: user.id.toString(),
          presence,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${user.email} (${socket.id})`);
        // Update user's presence to offline
        updateUserPresence(user.id.toString(), 'offline');

        // Notify other users
        socket.broadcast.emit('userPresenceChanged', {
          userId: user.id.toString(),
          presence: 'offline',
        });
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('Socket.io server already running');
  }
  res.end();
}

// Utility functions (implement these according to your application's logic)

// Generate a unique ID for messages
function generateUniqueId(): string {
  // Implement your own unique ID generation logic
  return 'unique_message_id'; // Placeholder
}

// Save message to the database
async function saveMessageToDatabase(message: Message) {
  try {
    const result = await query(
      `INSERT INTO messages (room_id, user_id, content, type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [message.roomId, message.userId, message.content, 'text']
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error saving message:', error);
    throw error;
  }
}

// Update message reaction in the database
async function updateMessageReactionInDatabase(messageId: string, emoji: string, userId: string) {
  try {
    await query(
      `UPDATE messages 
       SET reactions = COALESCE(reactions, '{}'::jsonb) || jsonb_build_object($2, jsonb_build_array($3))
       WHERE id = $1`,
      [messageId, emoji, userId]
    );
  } catch (error) {
    console.error('Database error updating reaction:', error);
    throw error;
  }
}

// Edit message in the database
async function editMessageInDatabase(messageId: string, content: string, userId: string) {
  try {
    const result = await query(
      `UPDATE messages 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [content, messageId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Message not found or user not authorized');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Database error editing message:', error);
    throw error;
  }
}

// Delete message from the database
async function deleteMessageFromDatabase(messageId: string, userId: string) {
  try {
    const result = await query(
      `DELETE FROM messages 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [messageId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Message not found or user not authorized');
    }
  } catch (error) {
    console.error('Database error deleting message:', error);
    throw error;
  }
}

// Update user's presence status
async function updateUserPresence(userId: string, presence: User['presence']) {
  try {
    await query(
      `UPDATE users 
       SET presence = $1, last_active = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [presence, userId]
    );
  } catch (error) {
    console.error('Database error updating presence:', error);
    throw error;
  }
}
