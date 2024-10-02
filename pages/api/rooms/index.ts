// pages/api/rooms/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

interface Room {
  _id?: ObjectId;
  name: string;
  createdAt: Date;
}

interface RoomResponse {
  _id: string;
  name: string;
  createdAt: string;
}

interface RoomsApiResponse {
  success: boolean;
  rooms?: RoomResponse[];
  error?: string;
}

interface CreateRoomApiResponse {
  success: boolean;
  room?: RoomResponse;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RoomsApiResponse | CreateRoomApiResponse>
) {
  const client = await clientPromise;
  const db = client.db('anonymous-chat');
  const roomsCollection = db.collection<Room>('rooms');

  if (req.method === 'GET') {
    try {
      const rooms = await roomsCollection.find({}).sort({ createdAt: -1 }).toArray();

      // Convert ObjectId and Date to strings
      const roomsWithStringId: RoomResponse[] = rooms.map((room) => ({
        _id: room._id?.toHexString() || '',
        name: room.name,
        createdAt: room.createdAt.toISOString(),
      }));

      res.status(200).json({ success: true, rooms: roomsWithStringId });
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
    }
  } else if (req.method === 'POST') {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid room name' });
      return;
    }

    try {
      const createdAt = new Date();

      const newRoom = await roomsCollection.insertOne({
        name,
        createdAt,
      });

      res.status(201).json({
        success: true,
        room: {
          _id: newRoom.insertedId.toHexString(),
          name,
          createdAt: createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ success: false, error: 'Failed to create room' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
