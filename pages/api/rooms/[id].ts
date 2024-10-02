import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb'';
import { ObjectId } from 'mongodb';

interface Room {
  _id?: ObjectId;
  name: string;
  createdAt: Date;
}

interface RoomResponse {
  _id: string;
  name: string;
  createdAt: string; // ISO string
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
        },
      });
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch room' });
    }
  } else if (req.method === 'PUT') {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid room name' });
      return;
    }

    try {
      const result = await roomsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { name } },
        { returnDocument: 'after' }
      );

      if (!result) {
        res.status(404).json({ success: false, error: 'Room not found' });
        return;
      }

      res.status(200).json({
        success: true,
        room: {
          _id: result._id.toString(),
          name: result.name,
          createdAt: result.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({ success: false, error: 'Failed to update room' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await roomsCollection.findOneAndDelete({ _id: new ObjectId(id) });

      if (!result) {
        res.status(404).json({ success: false, error: 'Room not found' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ success: false, error: 'Failed to delete room' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}