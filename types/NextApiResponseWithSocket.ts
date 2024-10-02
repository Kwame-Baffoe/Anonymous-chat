// types/NextApiResponseWithSocket.ts

import type { NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Socket as NetSocket } from 'net';

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
    // Add NetSocket to match the expected structure
    writable: boolean;
    readable: boolean;
    // Any other properties that you need to include from the NetSocket interface
  } & NetSocket;
}