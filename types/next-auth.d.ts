// types/next-auth.d.ts

import NextAuth from 'next-auth';
import { Server as IOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

