import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { query } from '../../lib/postgresql';
import sanitizeHtml from 'xss';

interface Room {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Handling room API request:', req.method);
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    console.log('Unauthorized access attempt - session not found or invalid');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  console.log('Session validated for user:', session.user.id);

  try {
    switch (req.method) {
      case 'GET':
        return handleGetRooms(req, res, session.user.id);
      case 'POST':
        return handleCreateRoom(req, res, session.user.id);
      case 'PUT':
        return handleUpdateRoom(req, res, session.user.id);
      default:
        console.log('Invalid request method:', req.method);
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling rooms request:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function handleGetRooms(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  console.log('Fetching chat rooms');
  const { page = '1', limit = '20', sort = 'updated_at' } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const offset = (pageNumber - 1) * limitNumber;

  try {
    // Get rooms with latest message and participant count
    const roomsResult = await query(
      `SELECT 
        r.*,
        m.content as last_message,
        m.created_at as last_message_at,
        u.name as last_message_user,
        COUNT(DISTINCT rp.user_id) as participant_count,
        EXISTS(
          SELECT 1 FROM room_participants 
          WHERE room_id = r.id AND user_id = $1
        ) as is_participant
      FROM rooms r
      LEFT JOIN room_participants rp ON r.id = rp.room_id
      LEFT JOIN (
        SELECT DISTINCT ON (room_id) *
        FROM messages
        ORDER BY room_id, created_at DESC
      ) m ON r.id = m.room_id
      LEFT JOIN users u ON m.user_id = u.id
      GROUP BY r.id, r.name, r.created_at, r.updated_at,
               m.content, m.created_at, u.name
      ORDER BY r.${sort === 'name' ? 'name' : 'updated_at'} DESC
      LIMIT $2 OFFSET $3`,
      [userId, limitNumber, offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(DISTINCT r.id) as total FROM rooms r',
      []
    );

    const totalRooms = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRooms / limitNumber);

    return res.status(200).json({
      success: true,
      data: roomsResult.rows,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalRooms,
        hasMore: pageNumber < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: 'Error fetching rooms' });
  }
}

async function handleCreateRoom(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    console.log(
      'Invalid room creation request - Room name is required and must be a non-empty string'
    );
    return res.status(400).json({
      success: false,
      error: 'Room name is required and must be a non-empty string',
    });
  }

  const sanitizedRoomName = sanitizeHtml(name.trim());

  try {
    // Check if room with the same name already exists
    const existingRoom = await query(
      'SELECT id FROM rooms WHERE name = $1',
      [sanitizedRoomName]
    );
    
    if (existingRoom.rows.length > 0) {
      console.log('Room creation failed - Room with this name already exists');
      return res
        .status(409)
        .json({ success: false, error: 'A room with this name already exists' });
    }

    // Create room and add creator as participant in a transaction
    const newRoom = await query(
      `INSERT INTO rooms (name, created_at, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [sanitizedRoomName]
    );

    // Add creator as participant
    await query(
      `INSERT INTO room_participants (room_id, user_id, joined_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [newRoom.rows[0].id, userId]
    );

    console.log('Room created successfully with ID:', newRoom.rows[0].id);
    
    return res.status(201).json({
      success: true,
      data: newRoom.rows[0],
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ success: false, error: 'Error creating room' });
  }
}

async function handleUpdateRoom(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { roomId, name } = req.body;
  if (!roomId) {
    console.log('Invalid roomId format');
    return res.status(400).json({ success: false, error: 'Invalid room ID' });
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    console.log(
      'Invalid room update request - Room name is required and must be a non-empty string'
    );
    return res.status(400).json({
      success: false,
      error: 'Room name is required and must be a non-empty string',
    });
  }

  const sanitizedRoomName = sanitizeHtml(name.trim());

  try {
    // Check if user is a participant and get room details
    const roomCheck = await query(
      `SELECT r.*, rp.user_id 
       FROM rooms r 
       JOIN room_participants rp ON r.id = rp.room_id 
       WHERE r.id = $1 AND rp.user_id = $2`,
      [roomId, userId]
    );

    if (roomCheck.rows.length === 0) {
      console.log('Room not found or user not participant:', roomId);
      return res.status(404).json({ 
        success: false, 
        error: 'Room not found or you are not a participant' 
      });
    }

    // Update room
    const updatedRoom = await query(
      `UPDATE rooms 
       SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [sanitizedRoomName, roomId]
    );

    return res.status(200).json({ success: true, data: updatedRoom.rows[0] });
  } catch (error) {
    console.error('Error updating room:', error);
    return res.status(500).json({ success: false, error: 'Error updating room' });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
