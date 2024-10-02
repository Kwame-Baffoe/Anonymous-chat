// pages/api/rooms/[id]/messages.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

interface Message {
  _id?: ObjectId;
  roomId: string;
  senderId: string;
  message: string;
  timestamp: Date;
}

interface MessagesApiResponse {
  success: boolean;
  messages?: {
    senderId: string;
    message: string;
    timestamp: string;
  }[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessagesApiResponse>
) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (!id || typeof id !== 'string') {
    res.status(400).json({ success: false, error: 'Invalid room ID' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');
    const messagesCollection = db.collection<Message>('messages');

    const messages = await messagesCollection
      .find({ roomId: id })
      .sort({ timestamp: 1 })
      .toArray();

    const formattedMessages = messages.map((msg) => ({
      senderId: msg.senderId,
      message: msg.message,
      timestamp: msg.timestamp.toISOString(),
    }));

    res.status(200).json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
}
