import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

interface Message {
  _id?: ObjectId;
  roomId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  content: string;
  timestamp: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { roomId } = req.query;

  if (typeof roomId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid room ID' });
  }

  const client = await clientPromise;
  const db = client.db('anonymous-chat');
  const messagesCollection = db.collection<Message>('messages');

  if (req.method === 'GET') {
    try {
      const messages = await messagesCollection
        .find({ roomId: new ObjectId(roomId) })
        .sort({ timestamp: 1 })
        .toArray();

      const formattedMessages = messages.map(message => ({
        _id: message._id?.toString(),
        senderId: message.senderId.toString(),
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      }));

      res.status(200).json({ success: true, messages: formattedMessages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
}