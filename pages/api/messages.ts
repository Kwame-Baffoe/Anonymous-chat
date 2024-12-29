import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { query } from '../../lib/postgresql';
import sanitizeHtml from 'sanitize-html';
import { CryptoService } from '../../services/CryptoService';

interface Message {
  id: number;
  room_id: number;
  user_id: number;
  content: string;
  type: string;
  created_at: Date;
  updated_at: Date;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`Received ${req.method} request to ${req.url}`);

  const session = await getSession({ req });

  if (!session) {
    console.log('Unauthorized access attempt');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  console.log('Session:', session);

  try {
    switch (req.method) {
      case 'GET':
        return getMessages(req, res);
      case 'POST':
        return createMessage(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getMessages(req: NextApiRequest, res: NextApiResponse) {
  console.log('Fetching messages');
  const { roomId, page = '1', limit = '20' } = req.query;
  const session = await getSession({ req });
  
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!roomId) {
    console.log('Missing roomId in request');
    return res.status(400).json({ success: false, error: 'Room ID is required' });
  }

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const offset = (pageNumber - 1) * limitNumber;

  try {
    // Get messages with user information and room public key
    const messagesResult = await query(
      `SELECT m.*, u.name as username, r.public_key as room_public_key,
              u2.private_key as user_private_key
       FROM messages m 
       LEFT JOIN users u ON m.user_id = u.id 
       LEFT JOIN rooms r ON m.room_id = r.id
       LEFT JOIN users u2 ON u2.id = $4
       WHERE m.room_id = $1 
       ORDER BY m.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [roomId, limitNumber, offset, session.user.id]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM messages WHERE room_id = $1',
      [roomId]
    );

    const totalMessages = parseInt(countResult.rows[0].total);

    console.log(`Fetched ${messagesResult.rows.length} messages for room ${roomId}`);
    
    // Transform messages to match frontend format
    const transformedMessages = await Promise.all(messagesResult.rows.map(async msg => {
      let decryptedContent = msg.content;
      if (msg.content && msg.type !== 'audio') {
        try {
          decryptedContent = await CryptoService.decrypt(
            msg.content,
            msg.room_public_key,
            msg.user_private_key
          );
        } catch (error) {
          console.error('Error decrypting message:', error);
          decryptedContent = '[Unable to decrypt message]';
        }
      }

      return {
        _id: msg.id.toString(),
        roomId: msg.room_id.toString(),
        userId: msg.user_id.toString(),
        username: msg.username,
        content: decryptedContent,
        createdAt: msg.created_at.toISOString(),
        updatedAt: msg.updated_at?.toISOString(),
        reactions: msg.reactions || {},
        attachments: msg.attachments || [],
        isEdited: msg.created_at.getTime() !== msg.updated_at?.getTime(),
        readBy: msg.read_by || [],
        parentId: msg.parent_id?.toString(),
        thread: msg.thread || []
      };
    }));

    return res.status(200).json({
      results: transformedMessages,
      nextPage: pageNumber * limitNumber < totalMessages ? pageNumber + 1 : null
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ success: false, error: 'Error fetching messages' });
  }
}

async function createMessage(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  console.log('Creating new message');
  const { roomId, content, audioUrl } = req.body;

  if (!roomId || (!content && !audioUrl)) {
    console.log('Missing roomId or content/audioUrl in request');
    return res.status(400).json({ success: false, error: 'Room ID and either content or audioUrl are required' });
  }

  let messageContent = content;
  let messageType = 'text';

  if (content) {
    messageContent = sanitizeHtml(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: {
        'a': ['href']
      }
    });
  } else if (audioUrl) {
    messageContent = audioUrl;
    messageType = 'audio';
  }

  try {
    // Get room public key and user private key
    const keysResult = await query(
      `SELECT r.public_key as room_public_key, u.private_key as user_private_key
       FROM rooms r
       CROSS JOIN users u
       WHERE r.id = $1 AND u.id = $2`,
      [roomId, session.user.id]
    );

    if (!keysResult.rows[0]) {
      return res.status(404).json({ success: false, error: 'Room or user not found' });
    }

    // Encrypt message content if it's not an audio message
    if (messageType !== 'audio') {
      try {
        messageContent = await CryptoService.encrypt(
          messageContent,
          keysResult.rows[0].room_public_key,
          keysResult.rows[0].user_private_key
        );
      } catch (error) {
        console.error('Error encrypting message:', error);
        return res.status(500).json({ success: false, error: 'Error encrypting message' });
      }
    }

    // Insert message
    const messageResult = await query(
      `INSERT INTO messages (room_id, user_id, content, type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [roomId, session.user.id, messageContent, messageType]
    );

    // Update room's last message
    await query(
      `UPDATE rooms 
       SET name = COALESCE(
         CASE 
           WHEN $2 = 'audio' THEN 'Audio message'
           ELSE $1
         END,
         name
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [messageContent, messageType, roomId]
    );

    // Get user information
    const userResult = await query(
      'SELECT name as username FROM users WHERE id = $1',
      [session.user.id]
    );

    const message = {
      ...messageResult.rows[0],
      username: userResult.rows[0].username
    };

    console.log(`Created new message in room ${roomId}`);
    // Transform message to match frontend format
    const transformedMessage = {
      _id: message.id.toString(),
      roomId: message.room_id.toString(),
      userId: message.user_id.toString(),
      username: message.username,
      content: message.content,
      createdAt: message.created_at.toISOString(),
      updatedAt: message.updated_at?.toISOString(),
      reactions: {},
      attachments: [],
      isEdited: false,
      readBy: [],
      thread: []
    };

    return res.status(201).json(transformedMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ success: false, error: 'Error creating message' });
  }
}
