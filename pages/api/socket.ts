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
      path: '/api/socketio',
      addTrailingSlash: false, // Ensure the path is correct
    });

    // Middleware for authentication
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (token) {
        try {
          // Verify JWT token (you need to provide the secret or public key)
          const user = jwt.verify(token, process.env.JWT_SECRET as string) as User;
          socket.data.user = user; // Attach user data to the socket
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
      const user = socket.data.user as User;
      console.log(`User connected: ${user.username} (${socket.id})`);

      // Handle joining a room
      socket.on('joinRoom', (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${user.username} joined room ${roomId}`);
      });

      // Handle leaving a room
      socket.on('leaveRoom', (roomId: string) => {
        socket.leave(roomId);
        console.log(`User ${user.username} left room ${roomId}`);
      });

      // Handle sending a message
      socket.on('sendMessage', async (data: { roomId: string; content: string; attachments?: any[] }) => {
        const { roomId, content, attachments } = data;

        // Create message object
        const message: Message = {
          _id: generateUniqueId(), // Implement a function to generate unique IDs
          roomId,
          userId: user._id,
          username: user.username,
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
          userId: user._id,
          username: user.username,
        });
      });

      // Handle user stopped typing
      socket.on('userStoppedTyping', (data: { roomId: string }) => {
        const { roomId } = data;
        socket.to(roomId).emit('userStoppedTyping', {
          userId: user._id,
          username: user.username,
        });
      });

      // Handle message reaction
      socket.on('messageReaction', (data: { messageId: string; emoji: string; roomId: string }) => {
        const { messageId, emoji, roomId } = data;

        // Update message reactions in the database (implement your own logic)
        try {
          updateMessageReactionInDatabase(messageId, emoji, user._id);
        } catch (error) {
          console.error('Error updating message reaction:', error);
        }

        // Notify clients about the new reaction
        io.in(roomId).emit('messageReaction', {
          messageId,
          emoji,
          userId: user._id,
        });
      });

      // Handle editing a message
      socket.on('editMessage', async (data: { messageId: string; content: string; roomId: string }) => {
        const { messageId, content, roomId } = data;

        // Update message content in the database (implement your own logic)
        try {
          await editMessageInDatabase(messageId, content, user._id);
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
          await deleteMessageFromDatabase(messageId, user._id);
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
        updateUserPresence(user._id, presence);

        // Notify other users about the presence change
        socket.broadcast.emit('userPresenceChanged', {
          userId: user._id,
          presence,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${user.username} (${socket.id})`);
        // Update user's presence to offline
        updateUserPresence(user._id, 'offline');

        // Notify other users
        socket.broadcast.emit('userPresenceChanged', {
          userId: user._id,
          presence: 'offline',
        });
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('Socket.io server already initialized');
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
