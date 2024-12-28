import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser, getUserByEmail } from '../../../lib/users';
import bcrypt from 'bcryptjs';

interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<SignupResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} Not Allowed` 
    });
  }

  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'An account with this email already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      // Create the user
      const user = await createUser({
        name,
        email,
        password: hashedPassword,
      });

      // Return success without sensitive data
      return res.status(201).json({ 
        success: true, 
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('User creation error:', error);
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          return res.status(409).json({
            success: false,
            message: 'An account with this email already exists'
          });
        }
      }
      throw error; // Let the outer catch handle other errors
    }
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup';
    return res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
}
