import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSession } from 'next-auth/react';

interface Room {
  _id?: ObjectId;
  name: string;
  createdAt: Date;
  createdBy: ObjectId;
}

interface RoomResponse {
  _id: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

interface RoomApiResponse {
  success: boolean;
  room?: RoomResponse;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RoomApiResponse>
) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('anonymous-chat');
  const roomsCollection = db.collection<Room>('rooms');

  const { id } = req.query;

  if (typeof id !== 'string') {
    res.status(400).json({ success: false, error: 'Invalid room ID' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const room = await roomsCollection.findOne({ _id: new ObjectId(id) });

      if (!room) {
        res.status(404).json({ success: false, error: 'Room not found' });
        return;
      }

      res.status(200).json({
        success: true,
        room: {
          _id: room._id.toString(),
          name: room.name,
          createdAt: room.createdAt.toISOString(),
          createdBy: room.createdBy.toString(),
        },
      });
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch room' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}