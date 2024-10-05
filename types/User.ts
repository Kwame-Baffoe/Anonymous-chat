// types/User.ts

export interface User {
    _id?: string;
    name: string;
    email: string;
    password: string; // Hashed password
    createdAt: string;
  }
  