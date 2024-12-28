import { query, transaction } from './postgresql';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  image?: string;
  created_at: Date;
  updated_at: Date;
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
    return result.rows[0];
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
    return result.rows[0] || null;
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

    const result = await query(
      `INSERT INTO users (name, email, password, image, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userData.name, userData.email, hashedPassword, userData.image || null]
    );

    return result.rows[0];
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

    const updatedUser = result.rows[0] || null;
    if (updatedUser) {
      console.log(`User ${id} updated successfully`);
    } else {
      console.log(`No user found with id ${id} for update`);
    }
    return updatedUser;
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

  console.log('Starting password validation...');
  console.log('Stored hash:', user.password);
  console.log('Password to validate length:', password.length);
  console.log('Hash validation:', {
    isHash: user.password.startsWith('$2'),
    hashLength: user.password.length,
    expectedLength: 60 // bcrypt hashes are always 60 characters
  });
  
  if (!user.password.startsWith('$2') || user.password.length !== 60) {
    console.error('Invalid password hash format');
    return null;
  }

  try {
    console.log('Attempting bcrypt compare...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison completed. Result:', isValid);
    
    if (!isValid) {
      console.error(`Authentication failed: Invalid password for user: ${email}`);
      console.log('Password validation details:', {
        providedPasswordLength: password.length,
        storedHashValid: user.password.startsWith('$2') && user.password.length === 60,
        timestamp: new Date().toISOString()
      });
      return null;
    }
    
    console.log('Password validated successfully');
    return user;
  } catch (error) {
    console.error('Error in password validation:', error);
    return null;
  }
}
