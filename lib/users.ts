import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');
    const user = await db.collection<User>('users').findOne({ email });
    return user;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw new Error('Failed to fetch user by email');
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');
    const user = await db.collection<User>('users').findOne({ _id: new ObjectId(id) });
    return user;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw new Error('Failed to fetch user by ID');
  }
}

export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');

    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser: Omit<User, '_id'> = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection<User>('users').insertOne(newUser as User);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create user');
    }

    return { ...newUser, _id: result.insertedId };
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');

    const updateObject: { [key: string]: any } = { ...updateData, updatedAt: new Date() };

    if (updateData.password) {
      updateObject.password = await bcrypt.hash(updateData.password, 10);
    }

    const result = await db.collection<User>('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateObject },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw new Error('Failed to update user');
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db('anonymous-chat');

    const result = await db.collection<User>('users').deleteOne({ _id: new ObjectId(id) });

    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw new Error('Failed to delete user');
  }
}

export async function validateUserCredentials(email: string, password: string): Promise<User | null> {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error in validateUserCredentials:', error);
    throw new Error('Failed to validate user credentials');
  }
}