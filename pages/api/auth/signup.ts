// pages/api/auth/signup.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser, getUserByEmail } from '../../../lib/users';
import bcrypt from 'bcryptjs';

interface SignupResponse {
  success: boolean;
  message?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SignupResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create the user
  const user = await createUser({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    return res.status(201).json({ success: true, message: 'User created successfully' });
  } else {
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
}
