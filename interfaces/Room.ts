// interfaces/Room.ts
import { ObjectId } from 'mongodb';

export interface Room {
  _id: ObjectId;
  name: string;
  createdAt: Date;
}

export interface CreateRoom {
  name: string;
  createdAt: Date;
}
