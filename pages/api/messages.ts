import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId, Db } from 'mongodb';
import sanitizeHtml from 'sanitize-html';

interface Message {
  _id?: ObjectId;
  roomId: ObjectId;
  userId: ObjectId;
  username: string;
  content?: string;
  audioUrl?: string;
  reactions: { [key: string]: string[] };
  createdAt: Date;
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
    const { db } = await connectToDatabase();

    switch (req.method) {
      case 'GET':
        return getMessages(req, res, db);
      case 'POST':
        return createMessage(req, res, db, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getMessages(req: NextApiRequest, res: NextApiResponse, db: Db) {
  console.log('Fetching messages');
  const { roomId, page = '1', limit = '20' } = req.query;

  if (!roomId) {
    console.log('Missing roomId in request');
    return res.status(400).json({ success: false, error: 'Room ID is required' });
  }

  if (typeof roomId !== 'string' || !ObjectId.isValid(roomId)) {
    console.log('Invalid roomId format');
    return res.status(400).json({ success: false, error: 'Invalid Room ID format' });
  }

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  try {
    const messages = await db
      .collection('messages')
      .find({ roomId: new ObjectId(roomId as string) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();

    const totalMessages = await db
      .collection('messages')
      .countDocuments({ roomId: new ObjectId(roomId as string) });

    console.log(`Fetched ${messages.length} messages for room ${roomId}`);
    return res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalMessages / limitNumber),
        totalMessages,
        hasMore: pageNumber * limitNumber < totalMessages,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ success: false, error: 'Error fetching messages' });
  }
}

async function createMessage(req: NextApiRequest, res: NextApiResponse, db: Db, session: any) {
  console.log('Creating new message');
  const { roomId, content, audioUrl } = req.body;

  if (!roomId || (!content && !audioUrl)) {
    console.log('Missing roomId or content/audioUrl in request');
    return res.status(400).json({ success: false, error: 'Room ID and either content or audioUrl are required' });
  }

  if (typeof roomId !== 'string' || !ObjectId.isValid(roomId)) {
    console.log('Invalid roomId format');
    return res.status(400).json({ success: false, error: 'Invalid Room ID format' });
  }

  const message: Message = {
    roomId: new ObjectId(roomId),
    userId: new ObjectId(session.user.id),
    username: session.user.name,
    reactions: {},
    createdAt: new Date(),
  };

  if (content) {
    message.content = sanitizeHtml(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: {
        'a': ['href']
      }
    });
  }

  if (audioUrl) {
    message.audioUrl = audioUrl;
  }

  try {
    const result = await db.collection('messages').insertOne(message);
    message._id = result.insertedId;

    await db.collection('rooms').updateOne(
      { _id: new ObjectId(roomId) },
      { $set: { lastMessage: content || 'Audio message', lastMessageAt: new Date() } }
    );

    console.log(`Created new message in room ${roomId}`);
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ success: false, error: 'Error creating message' });
  }
}