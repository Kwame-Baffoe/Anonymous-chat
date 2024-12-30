import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser, getUserByEmail } from '../../../lib/users';
import { rateLimit } from '../../../lib/rate-limit';

interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

const validatePassword = (password: string): { isValid: boolean; message: string } => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: `Password must be at least ${minLength} characters long` };
  }
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }

  return { isValid: true, message: '' };
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validateName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s-]+$/.test(name);
};

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
    // Apply rate limiting
    try {
      await rateLimit(req, 'signup');
    } catch (error) {
      return res.status(429).json({
        success: false,
        message: 'Too many signup attempts. Please try again later.'
      });
    }

    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // Validate name
    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters and contain only letters, numbers, spaces, and hyphens'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: passwordValidation.message 
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

    try {
      // Create the user (password hashing is handled in createUser)
      const user = await createUser({
        name,
        email,
        password,
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
