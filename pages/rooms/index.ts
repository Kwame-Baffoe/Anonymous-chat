// pages/api/rooms/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';

interface Room {
  _id: string;
  name: string;
  createdAt: Date;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db('anonymous-chat');
  const roomsCollection = db.collection<Room>('rooms');

  if (req.method === 'GET') {
    try {
      const rooms = await roomsCollection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json({ success: true, rooms });
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
      const newRoom = await roomsCollection.insertOne({
        name,
        createdAt: new Date(),
      });

      res.status(201).json({ success: true, room: { _id: newRoom.insertedId, name, createdAt: new Date() } });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ success: false, error: 'Failed to create room' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
