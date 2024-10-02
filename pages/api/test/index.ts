// pages/api/test/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');

    // Simple query to test the connection
    const collections = await db.collections();
    const collectionNames = collections.map((col) => col.collectionName);

    res.status(200).json({ success: true, collections: collectionNames });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Connection failed' });
  }
}
