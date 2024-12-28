import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import pool from '../../../lib/postgresql';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update current user's last_active
    await pool.query(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE email = $1',
      [session.user.email]
    );

    if (req.method === 'GET') {
      // Get online users from database
      const result = await pool.query(
        'SELECT id, name, email, last_active FROM users WHERE last_active > NOW() - INTERVAL \'5 minutes\''
      );

      return res.status(200).json(result.rows);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling online users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
