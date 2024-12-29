// interfaces/Room.ts
export interface Room {
  _id: string;
  name: string;
  createdAt: Date;
  publicKey: string;
  lastMessage?: string;
}

export interface CreateRoom {
  name: string;
  createdAt: Date;
}
