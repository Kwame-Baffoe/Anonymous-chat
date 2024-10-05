import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../lib/mongodb';
import { ObjectId, Db } from 'mongodb';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket } from 'socket.io-client';


export interface Message {
  _id?: ObjectId;
  roomId: ObjectId;
  userId: ObjectId;
  username: string;
  content: string;
  createdAt: Date;
}

export const config = {
  api: {
    bodyParser: true,
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
} // let add the mongodb to the files in there

async function getMessages(req: NextApiRequest, res: NextApiResponse, db: Db) {
  console.log('Fetching messages');
  const { roomId, page = '1', limit = '50' } = req.query;

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
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Error fetching messages' });
  }
}

async function createMessage(req: NextApiRequest, res: NextApiResponse, db: Db, session: any) {
  console.log('Creating new message');
  const { roomId, content } = req.body;

  if (!roomId || !content) {
    console.log('Missing roomId or content in request');
    return res.status(400).json({ success: false, error: 'Room ID and content are required' });
  }

  const message: Message = {
    roomId: new ObjectId(roomId),
    userId: new ObjectId(session.user.id),
    username: session.user.name,
    content,
    createdAt: new Date(),
  };

  try {
    const result = await db.collection('messages').insertOne(message);
    message._id = result.insertedId;

    await db.collection('rooms').updateOne(
      { _id: new ObjectId(roomId) },
      { $set: { lastMessage: content, lastMessageAt: new Date() } }
    );

    // @ts-ignore
    const io: SocketIOServer = (res.socket as any).server.io;
    if (io) {
      io.to(roomId).emit('newMessage', message);
    }

    console.log(`Created new message in room ${roomId}`);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Error creating message' });
  }
}

export const ioHandler = (req: NextApiRequest, res: NextApiResponse & { socket: any }) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO');
    const httpServer: NetServer = res.socket.server as any;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socketio',
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('New client connected');

      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Client joined room: ${roomId}`);
      });

      socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`Client left room: ${roomId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }
  res.end();
};