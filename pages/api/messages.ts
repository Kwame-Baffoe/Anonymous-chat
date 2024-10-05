import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId, Db } from 'mongodb';

interface Message {
  _id?: ObjectId;
  roomId: ObjectId;
  userId: ObjectId;
  username: string;
  content?: string;
  audioData?: string;
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
    res.status(405).end(`Method ${req.method} Not Allowed`);
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
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getMessages(req: NextApiRequest, res: NextApiResponse, db: Db) {
  console.log('Fetching messages');
  const { roomId, page = '1', limit = '20' } = req.query;

  if (!roomId) {
    console.log('Missing roomId in request');
    return res.status(400).json({ success: false, error: 'Room ID is required' });
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
    res.status(200).json({
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
    res.status(500).json({ success: false, error: 'Error fetching messages' });
  }
}

async function createMessage(
  req: NextApiRequest,
  res: NextApiResponse,
  db: Db,
  session: any
) {
  console.log('Creating new message');
  const { roomId, content, audioData } = req.body;

  if (!roomId || (!content && !audioData)) {
    console.log('Missing roomId or content/audioData in request');
    return res
      .status(400)
      .json({ success: false, error: 'Room ID and content are required' });
  }

  let message: Message = {
    roomId: new ObjectId(roomId),
    userId: new ObjectId(session.user.id),
    username: session.user.name,
    reactions: {},
    createdAt: new Date(),
  };

  if (content) {
    message.content = content;
  } else if (audioData) {
    // Save audio data to storage and get URL
    const audioUrl = await saveAudioData(audioData);
    message.audioUrl = audioUrl;
  }

  try {
    const result = await db.collection('messages').insertOne(message);
    message._id = result.insertedId;

    await db.collection('rooms').updateOne(
      { _id: new ObjectId(roomId) },
      { $set: { lastMessage: content || 'Voice Message', lastMessageAt: new Date() } }
    );

    console.log(`Created new message in room ${roomId}`);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Error creating message' });
  }
}

async function saveAudioData(audioData: string): Promise<string> {
  // Implement the logic to save audio data to storage and return the URL
  // For simplicity, we're returning a placeholder URL here
  return 'https://your-storage-service.com/audio/' + Date.now();
}
