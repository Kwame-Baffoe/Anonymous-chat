import { query, transaction } from './postgresql';
import bcrypt from 'bcryptjs';
import { CryptoService } from '../services/CryptoService';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  image?: string;
  created_at: Date;
  updated_at: Date;
  privateKey: string;
  presence?: 'online' | 'away' | 'busy' | 'offline';
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  image?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  image?: string;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    // Normalize email
    email = email.trim().toLowerCase();
    
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`No user found with email: ${email}`);
      return null;
    }

    console.log(`Successfully retrieved user with email: ${email}`);
    const dbUser = result.rows[0];
    if (dbUser) {
      // Transform database fields to match interface
      return {
        ...dbUser,
        privateKey: dbUser.private_key
      };
    }
    return null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Database error while fetching user with email: ${email}`);
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    const dbUser = result.rows[0];
    if (dbUser) {
      // Transform database fields to match interface
      return {
        ...dbUser,
        privateKey: dbUser.private_key
      };
    }
    return null;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw new Error('Failed to fetch user by ID');
  }
}

export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password with salt rounds of 12 to match signup
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    console.log('Password hashed successfully for new user');

    // Generate encryption keys for the user
    const keyPair = await CryptoService.generateKeyPair();

    const result = await query(
      `INSERT INTO users (name, email, password, image, private_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userData.name, userData.email, hashedPassword, userData.image || null, keyPair.privateKey]
    );

    const dbUser = result.rows[0];
    if (dbUser) {
      // Transform database fields to match interface
      return {
        ...dbUser,
        privateKey: dbUser.private_key
      };
    }
    throw new Error('Failed to create user');
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.name) {
      updates.push(`name = $${paramCount}`);
      values.push(updateData.name);
      paramCount++;
    }
    if (updateData.email) {
      updates.push(`email = $${paramCount}`);
      values.push(updateData.email);
      paramCount++;
    }
    if (updateData.password) {
      console.log('Hashing new password for update');
      const hashedPassword = await bcrypt.hash(updateData.password, 12); // Using consistent salt rounds
      console.log('Password hashed successfully for update');
      updates.push(`password = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }
    if (updateData.image !== undefined) {
      updates.push(`image = $${paramCount}`);
      values.push(updateData.image);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return await getUserById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    const dbUser = result.rows[0];
    if (dbUser) {
      console.log(`User ${id} updated successfully`);
      // Transform database fields to match interface
      return {
        ...dbUser,
        privateKey: dbUser.private_key
      };
    }
    console.log(`No user found with id ${id} for update`);
    return null;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw new Error('Failed to update user');
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount === 1;
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw new Error('Failed to delete user');
  }
}

export async function validateUserCredentials(email: string, password: string): Promise<User | null> {
  if (!email || !password) {
    console.error('Missing credentials');
    throw new Error('Email and password are required');
  }

  // Normalize email and password
  email = email.trim().toLowerCase();
  password = password.trim();

  console.log('Attempting to validate credentials for email:', email);
  
  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`Authentication failed: No user found with email: ${email}`);
    return null;
  }

  if (!user.password) {
    console.error(`Authentication failed: User ${email} has no password set`);
    return null;
  }

  try {
    console.log('Attempting bcrypt compare...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison completed. Result:', isValid);
    
    if (!isValid) {
      console.error(`Authentication failed: Invalid password for user: ${email}`);
      return null;
    }
    
    console.log('Password validated successfully');
    // Return user with the exact fields expected by NextAuth
    return {
      id: user.id.toString(), // Convert to string as expected by NextAuth
      email: user.email,
      name: user.name,
      privateKey: user.privateKey,
      password: user.password,
      created_at: user.created_at,
      updated_at: user.updated_at,
      presence: 'online' as const
    };
  } catch (error) {
    console.error('Error in password validation:', error);
    return null;
  }
}
