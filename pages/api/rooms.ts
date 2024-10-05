import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

interface Room {
  _id?: ObjectId;
  name: string;
  createdBy: ObjectId;
  createdAt: Date;
  lastMessage: string;
  lastMessageAt: Date | null;
  lastMessageUser: string;
  participants: ObjectId[];
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
    const client = await clientPromise;
    const db = client.db('anonymous-chat');
    const roomsCollection = db.collection<Room>('rooms');

    switch (req.method) {
      case 'GET':
        return handleGetRooms(req, res, roomsCollection);
      case 'POST':
        return handleCreateRoom(req, res, roomsCollection, session.user.id);
      case 'PUT':
        return handleUpdateRoom(req, res, roomsCollection, session.user.id);
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
  roomsCollection: any
) {
  console.log('Fetching chat rooms');
  const { page = '1', limit = '10', sort = 'lastMessageAt' } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const rooms = await roomsCollection
    .find()
    .sort({ [sort as string]: -1 })
    .skip(skip)
    .limit(limitNumber)
    .toArray();

  const totalRooms = await roomsCollection.countDocuments();
  const totalPages = Math.ceil(totalRooms / limitNumber);

  return res.status(200).json({
    success: true,
    data: rooms,
    pagination: {
      currentPage: pageNumber,
      totalPages,
      totalRooms,
      hasMore: pageNumber < totalPages,
    },
  });
}

async function handleCreateRoom(
  req: NextApiRequest,
  res: NextApiResponse,
  roomsCollection: any,
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

  // Check if room with the same name already exists
  const existingRoom = await roomsCollection.findOne({ name: name.trim() });
  if (existingRoom) {
    console.log('Room creation failed - Room with this name already exists');
    return res
      .status(409)
      .json({ success: false, error: 'A room with this name already exists' });
  }

  console.log('Creating new room:', name);
  const newRoom: Room = {
    name: name.trim(),
    createdBy: new ObjectId(userId),
    createdAt: new Date(),
    lastMessage: '',
    lastMessageAt: null,
    lastMessageUser: '',
    participants: [new ObjectId(userId)],
  };
  const result = await roomsCollection.insertOne(newRoom);
  console.log('Room created successfully with ID:', result.insertedId);
  return res.status(201).json({
    success: true,
    data: { ...newRoom, _id: result.insertedId },
  });
}

async function handleUpdateRoom(
  req: NextApiRequest,
  res: NextApiResponse,
  roomsCollection: any,
  userId: string
) {
  const { roomId, name } = req.body;
  if (!roomId || !ObjectId.isValid(roomId)) {
    return res.status(400).json({ success: false, error: 'Invalid room ID' });
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Room name is required and must be a non-empty string',
    });
  }

  const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  if (room.createdBy.toString() !== userId) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to update this room',
    });
  }

  const updatedRoom = await roomsCollection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    { $set: { name: name.trim() } },
    { returnDocument: 'after' }
  );

  return res.status(200).json({ success: true, data: updatedRoom.value });
}

export const config = {
  api: {
    bodyParser: true,
  },
};
